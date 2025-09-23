import { Camera, Upload, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HeroButton } from "@/components/ui/hero-button";
import foodScanIcon from "@/assets/food-scan-icon.png";

interface FoodScanCardProps {
  onFileSelect: (file: File) => void;
}

export function FoodScanCard({ onFileSelect }: FoodScanCardProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card hover:shadow-hero transition-all duration-300 border-border/50">
      <CardContent className="p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow">
            <img src={foodScanIcon} alt="Food Scan" className="w-16 h-16" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold mb-3 text-foreground">Instant Food Analysis</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Take a photo of your food and get instant nutritional insights with AI-powered analysis
        </p>
        
        <div className="space-y-4">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              id="camera-capture"
            />
            <label htmlFor="camera-capture">
              <HeroButton variant="scan" size="lg" className="w-full cursor-pointer" asChild>
                <span>
                  <Camera className="w-5 h-5" />
                  Take Photo
                </span>
              </HeroButton>
            </label>
          </div>
          
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <HeroButton variant="hero-secondary" size="lg" className="w-full cursor-pointer" asChild>
                <span>
                  <Upload className="w-5 h-5" />
                  Upload Image
                </span>
              </HeroButton>
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary" />
          <span>Powered by Advanced AI Vision</span>
        </div>
      </CardContent>
    </Card>
  );
}