import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Book, Calendar, BarChart, Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  memberOnly?: boolean;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, profile, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Main navigation links
  const navLinks: NavLink[] = [
    {
      name: "Reading",
      path: "/checklist",
      icon: <Book className="h-5 w-5" />,
    },
    {
      name: "History",
      path: "/history",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      name: "Stats",
      path: "/statistics",
      icon: <BarChart className="h-5 w-5" />,
    },
  ];

  // Admin link for desktop navigation only
  const adminLink: NavLink = {
    name: "Admin",
    path: "/admin",
    icon: <Settings className="h-5 w-5" />,
    adminOnly: true,
  };

  // Filter links based on user role (for desktop navigation)
  const desktopLinks = [...navLinks];
  if (isAdmin) {
    desktopLinks.push(adminLink);
  }

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 border-b bg-card/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Book className="h-5 w-5 text-primary" />
            <span className="text-sm sm:text-base font-bold">Net Missions Fellowship</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {desktopLinks.map((link) => (
              <Button
                key={link.path}
                variant={isActive(link.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => handleNavigation(link.path)}
                className="flex items-center gap-1 text-sm"
              >
                {link.icon}
                <span>{link.name}</span>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 sm:h-9 sm:w-9">
              {isDarkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {profile ? profile.first_name : user?.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel className="truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-3 sm:px-4 py-3 sm:py-4 mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Fixed 3 tabs for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t z-50 safe-area-bottom">
        <div className="grid grid-cols-3 h-16">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <button
                key={link.path}
                onClick={() => handleNavigation(link.path)}
                className={`flex flex-col items-center justify-center ${
                  active 
                    ? 'text-red-500 bg-red-50 dark:bg-red-950/20' 
                    : 'text-gray-500'
                }`}
              >
                <div className="flex flex-col items-center justify-center py-2">
                  {React.cloneElement(link.icon as React.ReactElement, {
                    className: `h-5 w-5 ${active ? 'text-red-500' : 'text-gray-500'}`
                  })}
                  <span className="mt-0.5 text-[11px] font-medium">
                    {link.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Padding to prevent content from being hidden under mobile navigation */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default AppLayout;
