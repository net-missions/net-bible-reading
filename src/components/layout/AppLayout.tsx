import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Book, Calendar, BarChart, Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = { name: string; path: string; icon: React.ReactNode };

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, profile, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks: NavLink[] = [
    { name: "Reading", path: "/checklist", icon: <Book className="h-5 w-5" /> },
    { name: "History", path: "/history", icon: <Calendar className="h-5 w-5" /> },
    { name: "Stats", path: "/statistics", icon: <BarChart className="h-5 w-5" /> },
  ];

  const desktopLinks = [...navLinks];
  if (isAdmin) desktopLinks.push({ name: "Admin", path: "/admin", icon: <Settings className="h-5 w-5" /> });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 border-b bg-card/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <span className="text-sm sm:text-base font-bold">NMF</span>
          </div>
          <nav className="hidden md:flex items-center space-x-1">
            {desktopLinks.map((link) => (
              <Button key={link.path} variant={isActive(link.path) ? "default" : "ghost"} size="sm" onClick={() => navigate(link.path)} className="flex items-center gap-1 text-sm">
                {link.icon}<span>{link.name}</span>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs">
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{profile?.first_name || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuLabel className="truncate">{profile ? `${profile.first_name} ${profile.last_name}` : "User"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem>
                {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><Settings className="h-4 w-4 mr-2" />Admin</DropdownMenuItem>}
                <DropdownMenuItem onClick={logout}><LogOut className="h-4 w-4 mr-2" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-3 sm:px-4 py-3 sm:py-4 mx-auto">{children}</main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
        <div className="grid grid-cols-3 h-14">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <button key={link.path} onClick={() => navigate(link.path)} className={`flex flex-col items-center justify-center ${active ? "text-primary" : "text-muted-foreground"}`}>
                {React.cloneElement(link.icon as React.ReactElement, { className: `h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}` })}
                <span className="mt-0.5 text-[11px] font-medium">{link.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="h-14 md:hidden" />
    </div>
  );
};

export default AppLayout;
