import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => setLanguage(language === "en" ? "ceb" : "en")}
    >
      <Globe className="h-4 w-4" />
      <span>{language === "en" ? "Bisaya" : "English"}</span>
    </Button>
  );
}
