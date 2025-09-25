import { useState } from "react";
import { Brain, Users, Globe, Zap, Shield, TrendingUp } from "lucide-react";
import { HeroButton } from "@/components/ui/hero-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FoodScanCard } from "@/components/nutrition/FoodScanCard";
import { ProfileModeSelector } from "@/components/nutrition/ProfileModeSelector";
import { LanguageSelector } from "@/components/nutrition/LanguageSelector";
import { NutritionResults } from "@/components/nutrition/NutritionResults";
import { LiveFoodScanner } from "@/components/nutrition/LiveFoodScanner";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-nutrition.jpg";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<"welcome" | "profile" | "language" | "scan" | "results">("welcome");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [analysisData, setAnalysisData] = useState(null);

  const handleFileSelect = async (file: File) => {
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        // Call AI analysis
        const { data, error } = await supabase.functions.invoke('analyze-food', {
          body: {
            imageData,
            profileMode: selectedProfile,
            language: selectedLanguage
          }
        });

        if (error) {
          console.error('Analysis error:', error);
          return;
        }

        setAnalysisData(data);
        setCurrentStep("results");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File processing error:', error);
    }
  };

  const handleLiveAnalysis = (data: any) => {
    setAnalysisData(data);
    setCurrentStep("results");
  };

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced computer vision identifies food and analyzes nutritional content instantly"
    },
    {
      icon: Users,
      title: "Profile-Based Guidance",
      description: "Tailored advice for children, pregnant women, elderly, and specific health needs"
    },
    {
      icon: Globe,
      title: "Multilingual Support",
      description: "Voice feedback in Hindi, Tamil, Bengali, Gujarati, and more regional languages"
    },
    {
      icon: Shield,
      title: "Deficiency Prevention",
      description: "Predictive analytics to identify and prevent nutritional deficiencies early"
    }
  ];

  if (currentStep === "profile") {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <ProfileModeSelector 
            selectedMode={selectedProfile}
            onModeSelect={(mode) => {
              setSelectedProfile(mode);
              setCurrentStep("language");
            }}
          />
        </div>
      </div>
    );
  }

  if (currentStep === "language") {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageSelect={(lang) => {
              setSelectedLanguage(lang);
              setCurrentStep("scan");
            }}
          />
          <div className="text-center">
            <HeroButton 
              variant="hero-secondary" 
              onClick={() => setCurrentStep("scan")}
              className="mt-4"
            >
              Continue to Food Scanner
            </HeroButton>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "scan") {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-3">Food Analysis Hub</h1>
            <p className="text-muted-foreground">Upload an image or use live camera for instant nutritional analysis</p>
            <Badge variant="secondary" className="mt-2">
              Profile: {selectedProfile} | Language: {selectedLanguage}
            </Badge>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2">
            <FoodScanCard onFileSelect={handleFileSelect} />
            <LiveFoodScanner 
              profileMode={selectedProfile || "general"}
              language={selectedLanguage}
              onAnalysisResult={handleLiveAnalysis}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "results" && analysisData) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <NutritionResults 
            data={analysisData} 
            profileMode={selectedProfile || "general"}
          />
          <div className="text-center mt-8 space-x-4">
            <HeroButton variant="scan" onClick={() => setCurrentStep("scan")}>
              Analyze Another Food
            </HeroButton>
            <HeroButton variant="hero-secondary" onClick={() => setCurrentStep("welcome")}>
              Start Over
            </HeroButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        
        <div className="relative max-w-6xl mx-auto text-center text-white">
          <div className="mb-8">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">
              AI-Powered Nutrition Intelligence
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Nutri<span className="text-primary-glow">Sahayak</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Combat protein and vitamin deficiency across India with AI-powered food analysis, 
              personalized nutrition guidance, and multilingual health insights.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <HeroButton 
              variant="hero" 
              size="lg"
              onClick={() => setCurrentStep("profile")}
              className="text-lg"
            >
              <Zap className="w-5 h-5" />
              Start Your Health Journey
            </HeroButton>
            <HeroButton variant="hero-secondary" size="lg" className="text-lg">
              <Brain className="w-5 h-5" />
              Learn More
            </HeroButton>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold mb-2">5+</div>
              <div className="text-white/80">Languages Supported</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold mb-2">AI-Powered</div>
              <div className="text-white/80">Vision Analysis</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold mb-2">Real-time</div>
              <div className="text-white/80">Health Insights</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Comprehensive Health Intelligence</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our advanced AI system combines computer vision, predictive analytics, and cultural wisdom 
              to deliver personalized nutrition guidance for every Indian family.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card shadow-card hover:shadow-hero transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-primary rounded-xl text-white shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Health?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of families already using NutriSahayak to prevent deficiencies and optimize nutrition.
          </p>
          <HeroButton 
            variant="hero" 
            size="lg" 
            onClick={() => setCurrentStep("profile")}
            className="bg-white text-primary hover:bg-white/90 text-lg"
          >
            <TrendingUp className="w-5 h-5" />
            Get Started Now
          </HeroButton>
        </div>
      </section>
    </div>
  );
};

export default Index;
