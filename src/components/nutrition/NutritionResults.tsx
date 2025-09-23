import { Activity, Zap, Shield, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface NutritionData {
  foodName: string;
  calories: number;
  protein: number;
  vitamins: { name: string; amount: number; unit: string }[];
  minerals: { name: string; amount: number; unit: string }[];
  deficiencyRisk: { nutrient: string; risk: "low" | "medium" | "high" }[];
}

interface NutritionResultsProps {
  data: NutritionData;
  profileMode: string;
}

export function NutritionResults({ data, profileMode }: NutritionResultsProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-success";
      case "medium": return "bg-warning";
      case "high": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const getProfileAdvice = (mode: string) => {
    const advice = {
      children: "This food supports healthy growth and development for children.",
      pregnant: "Good nutritional choice for maternal and fetal health.",
      elderly: "Suitable for maintaining health in older adults.",
      "weight-loss": "Fits well into a balanced weight management plan.",
      anemia: "Contains nutrients that help prevent anemia."
    };
    return advice[mode as keyof typeof advice] || "Nutritional analysis complete.";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-hero">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{data.foodName}</h2>
              <p className="text-muted-foreground font-normal">Nutritional Analysis</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calories and Protein */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-success/10 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-success" />
                <span className="font-semibold">Calories</span>
              </div>
              <div className="text-2xl font-bold text-success">{data.calories}</div>
            </div>
            <div className="bg-gradient-primary/10 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-semibold">Protein</span>
              </div>
              <div className="text-2xl font-bold text-primary">{data.protein}g</div>
            </div>
          </div>

          {/* Vitamins */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              Vitamins
            </h3>
            <div className="grid gap-3">
              {data.vitamins.map((vitamin, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{vitamin.name}</span>
                  <Badge variant="secondary">{vitamin.amount}{vitamin.unit}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Minerals */}
          <div>
            <h3 className="font-semibold mb-3">Minerals</h3>
            <div className="grid gap-3">
              {data.minerals.map((mineral, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{mineral.name}</span>
                  <Badge variant="secondary">{mineral.amount}{mineral.unit}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Deficiency Risk */}
          <div>
            <h3 className="font-semibold mb-3">Deficiency Risk Assessment</h3>
            <div className="space-y-2">
              {data.deficiencyRisk.map((risk, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium">{risk.nutrient}</span>
                  <Badge className={`${getRiskColor(risk.risk)} text-white`}>
                    {risk.risk.toUpperCase()} RISK
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Profile-specific advice */}
          <div className="bg-gradient-hero/10 p-4 rounded-xl">
            <h4 className="font-semibold mb-2">Personalized Advice</h4>
            <p className="text-sm text-muted-foreground">{getProfileAdvice(profileMode)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}