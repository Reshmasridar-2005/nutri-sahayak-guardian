import { Globe, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const languages = [
  { code: "hi", name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳" },
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageSelect: (language: string) => void;
}

export function LanguageSelector({ selectedLanguage, onLanguageSelect }: LanguageSelectorProps) {
  return (
    <Card className="bg-gradient-card shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-primary rounded-xl text-white">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Select Language</h3>
            <p className="text-sm text-muted-foreground">Choose your preferred language for voice feedback</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => onLanguageSelect(language.code)}
              className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                selectedLanguage === language.code
                  ? "bg-gradient-primary text-white border-primary shadow-glow"
                  : "bg-card hover:bg-muted border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
              </div>
              <div className="text-sm opacity-80">{language.nativeName}</div>
            </button>
          ))}
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="w-4 h-4 text-primary" />
          <span>Voice responses powered by advanced AI</span>
        </div>
      </CardContent>
    </Card>
  );
}