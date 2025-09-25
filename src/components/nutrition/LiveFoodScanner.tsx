import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, CameraOff, Zap, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HeroButton } from "@/components/ui/hero-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LiveFoodScannerProps {
  profileMode: string;
  language: string;
  onAnalysisResult: (data: any) => void;
}

export function LiveFoodScanner({ profileMode, language, onAnalysisResult }: LiveFoodScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        toast({
          title: "Camera Ready",
          description: "Point your camera at food for instant analysis",
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      console.log('Capturing frame for analysis...');

      // Send to AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: {
          imageData,
          profileMode,
          language
        }
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }

      console.log('Analysis result:', data);
      onAnalysisResult(data);

      // Generate voice feedback
      const nutritionSummary = generateNutritionSummary(data, profileMode);
      await speakResult(nutritionSummary, language);

      toast({
        title: "Analysis Complete",
        description: `Found: ${data.foodName}`,
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Could not analyze food",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [profileMode, language, onAnalysisResult, isAnalyzing]);

  const generateNutritionSummary = (data: any, profile: string): string => {
    const profileTips = {
      children: "This food provides essential nutrients for healthy growth and development.",
      pregnant: "Good nutritional choice supporting both maternal and fetal health.",
      elderly: "Suitable for maintaining health and vitality in older adults.",
      "weight-loss": "This fits well into a balanced weight management plan.",
      anemia: "Contains nutrients that help prevent anemia and boost energy."
    };

    return `I found ${data.foodName}. It contains ${data.calories} calories and ${data.protein} grams of protein. ${
      profileTips[profile as keyof typeof profileTips] || profileTips.children
    } ${data.profileAdvice || ''} ${
      data.deficiencyRisk?.length > 0 
        ? `Please note: ${data.deficiencyRisk[0].reason}` 
        : 'This appears to be a nutritionally balanced choice.'
    }`;
  };

  const speakResult = async (text: string, lang: string) => {
    try {
      setIsPlaying(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          language: lang,
          voice: 'alloy'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Play the audio
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();

    } catch (error) {
      console.error('Speech error:', error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Live Food Scanner</h3>
            <p className="text-muted-foreground">
              Point your camera at food for instant AI-powered nutritional analysis
            </p>
            <div className="flex gap-2 justify-center mt-3">
              <Badge variant="secondary">Profile: {profileMode}</Badge>
              <Badge variant="secondary">Language: {language}</Badge>
            </div>
          </div>

          <div className="relative bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
              style={{ transform: 'scaleX(-1)' }} // Mirror for selfie effect
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Camera not active</p>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <Zap className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p>Analyzing food...</p>
                </div>
              </div>
            )}

            {isPlaying && (
              <div className="absolute top-4 right-4">
                <div className="bg-primary/80 text-white p-2 rounded-lg flex items-center gap-2">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Speaking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            {!isStreaming ? (
              <HeroButton
                variant="scan"
                onClick={startCamera}
                className="flex-1 max-w-48"
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </HeroButton>
            ) : (
              <>
                <HeroButton
                  variant="nutrition"
                  onClick={captureAndAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 max-w-48"
                >
                  <Zap className="w-5 h-5" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Food'}
                </HeroButton>
                <HeroButton
                  variant="hero-secondary"
                  onClick={stopCamera}
                  className="px-4"
                >
                  <CameraOff className="w-5 h-5" />
                </HeroButton>
              </>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Powered by Advanced AI Vision & Voice</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}