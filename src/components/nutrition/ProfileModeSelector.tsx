import { Baby, Heart, User, Weight, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const profileModes = [
  {
    id: "children",
    name: "Children",
    description: "Growth-focused nutrition for kids",
    icon: Baby,
    color: "bg-gradient-success",
    benefits: ["Growth tracking", "Essential vitamins", "Healthy development"]
  },
  {
    id: "pregnant",
    name: "Pregnant Women",
    description: "Maternal and fetal health support",
    icon: Heart,
    color: "bg-gradient-primary",
    benefits: ["Folic acid tracking", "Iron monitoring", "Prenatal nutrition"]
  },
  {
    id: "elderly",
    name: "Elderly",
    description: "Age-appropriate nutritional guidance",
    icon: Shield,
    color: "bg-secondary",
    benefits: ["Bone health", "Heart support", "Cognitive nutrition"]
  },
  {
    id: "weight-loss",
    name: "Weight Management",
    description: "Healthy weight loss guidance",
    icon: Weight,
    color: "bg-warning",
    benefits: ["Calorie tracking", "Portion control", "Metabolic support"]
  },
  {
    id: "anemia",
    name: "Anemia Prevention",
    description: "Iron-rich nutrition focus",
    icon: User,
    color: "bg-destructive",
    benefits: ["Iron optimization", "B12 tracking", "Energy support"]
  }
];

interface ProfileModeSelectorProps {
  selectedMode: string | null;
  onModeSelect: (mode: string) => void;
}

export function ProfileModeSelector({ selectedMode, onModeSelect }: ProfileModeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-3 text-foreground">Choose Your Profile</h2>
        <p className="text-muted-foreground">Get personalized nutrition advice tailored to your specific needs</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profileModes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          
          return (
            <Card
              key={mode.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-card ${
                isSelected 
                  ? "ring-2 ring-primary shadow-hero" 
                  : "hover:scale-105 bg-gradient-card"
              }`}
              onClick={() => onModeSelect(mode.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${mode.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{mode.name}</h3>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {mode.benefits.map((benefit, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}