import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Language = "en" | "ceb";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.title": "Net Missions Fellowship",
    "login.subtitle": "Enter your name to continue",
    "login.signin": "Sign In",
    "login.description": "Enter your name to see your progress",
    "form.firstName": "First Name",
    "form.lastName": "Last Name",
    "form.firstName.error": "First name is required",
    "form.lastName.error": "Last name is required",
    "login.button": "Sign In",
    "login.button.submitting": "Signing in...",
    "login.firstTime": "First time?",
    "login.registerLink": "Register here",
    "register.title": "Register",
    "register.description": "Create an account to join the fellowship",
    "register.button": "Register",
    "register.button.submitting": "Registering...",
    "register.hasAccount": "Already have an account?",
    "register.loginLink": "Sign in here",
  },
  ceb: {
    "app.title": "Net Missions Fellowship",
    "login.subtitle": "Isulat ang imong pangalan para magpadayon",
    "login.signin": "Sign In",
    "login.description": "Isulat ang imong pangalan para makita ang imong progress",
    "form.firstName": "First Name",
    "form.lastName": "Last Name",
    "form.firstName.error": "Kinahanglan ang First Name",
    "form.lastName.error": "Kinahanglan ang Last Name",
    "login.button": "Sign In",
    "login.button.submitting": "Signing in...",
    "login.firstTime": "First time?",
    "login.registerLink": "Register sa dari",
    "register.title": "Register",
    "register.description": "Paghimo og account para makaapil sa fellowship",
    "register.button": "Register",
    "register.button.submitting": "Registering...",
    "register.hasAccount": "Naa na kay account?",
    "register.loginLink": "Sign in sa dari",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage === "en" || savedLanguage === "ceb") {
      return savedLanguage;
    }
    return "ceb"; // Default to Bisaya as requested/implied by original code
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
