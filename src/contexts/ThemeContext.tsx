
import React, { createContext, useContext, useEffect } from "react";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = false;

  // Always use light mode: remove dark class and clear any saved dark preference
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const toggleTheme = () => {
    // No-op: theme is always light
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
