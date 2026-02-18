import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Book, Calendar, BarChart, Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = { name: string; path: string; icon: React.ReactNode };

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, profile, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const greeting = getTimeGreeting();
  const displayName = profile?.first_name?.trim() || "there";

  const navLinks: NavLink[] = [
    { name: "Reading", path: "/checklist", icon: <Book className="h-5 w-5" /> },
    { name: "History", path: "/history", icon: <Calendar className="h-5 w-5" /> },
    { name: "Stats", path: "/statistics", icon: <BarChart className="h-5 w-5" /> },
  ];

  const desktopLinks = [...navLinks];
  if (isAdmin) desktopLinks.push({ name: "Admin", path: "/admin", icon: <Settings className="h-5 w-5" /> });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <main className="flex-1 w-full max-w-lg mx-auto pt-4 pb-8 px-4 sm:px-6 sm:pt-5 min-w-0">
        <p className="text-foreground text-lg font-semibold tracking-tight mb-1.5 sm:text-xl">
          {greeting}, {displayName}
        </p>
        {children}
      </main>
      
      <nav className="fixed left-1/2 -translate-x-1/2 bg-stone-900 rounded-full px-2 py-2 shadow-2xl z-50 flex items-center gap-1 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6">
        {navLinks.map((link) => {
          const active = isActive(link.path);
          return (
            <button 
              key={link.path} 
              onClick={() => navigate(link.path)} 
              className={cn(
                "flex items-center justify-center p-3 rounded-full transition-all",
                active ? "bg-stone-800 text-white shadow-lg scale-105" : "text-stone-400 hover:text-white"
              )}
            >
              {React.cloneElement(link.icon as React.ReactElement, { 
                className: cn("h-5 w-5", active ? "text-white" : "text-stone-400") 
              })}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
