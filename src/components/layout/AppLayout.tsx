
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Book, Calendar, BarChart, Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SidebarLink = {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, profile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const links: SidebarLink[] = [
    {
      name: "Today's Reading",
      path: "/dashboard",
      icon: <Book />,
    },
    {
      name: "Reading History",
      path: "/history",
      icon: <Calendar />,
    },
    {
      name: "Statistics",
      path: "/stats",
      icon: <BarChart />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings />,
    },
    {
      name: "Admin Dashboard",
      path: "/admin",
      icon: <BarChart />,
      adminOnly: true,
    },
  ];

  // Filter out admin links for non-admin users
  const filteredLinks = links.filter(
    (link) => !link.adminOnly || user?.role === "admin"
  );

  // Setup sidebar overlay visibility sync with sidebar state
  useEffect(() => {
    const handleSidebarVisibilityChange = () => {
      const sidebar = document.getElementById("sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      
      if (sidebar && overlay) {
        const isHidden = sidebar.classList.contains("-translate-x-full");
        overlay.style.opacity = isHidden ? "0" : "1";
        overlay.style.pointerEvents = isHidden ? "none" : "auto";
      }
    };

    // Setup mutation observer to watch for sidebar class changes
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      const observer = new MutationObserver(handleSidebarVisibilityChange);
      observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
      
      // Initial call to set the correct state
      handleSidebarVisibilityChange();
      
      // Cleanup function
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => {
            const sidebar = document.getElementById("sidebar");
            if (sidebar) {
              sidebar.classList.toggle("-translate-x-full");
            }
          }}
        >
          <Book className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        id="sidebar"
        className="fixed inset-y-0 left-0 w-64 transform -translate-x-full lg:translate-x-0 z-40 transition-transform duration-300 ease-in-out bg-card border-r border-border"
      >
        <div className="flex flex-col h-full">
          <div className="p-4">
            <div className="flex items-center space-x-2">
              <Book className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Scripture Stride</h1>
            </div>
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredLinks.map((link) => (
              <Button
                key={link.path}
                variant={window.location.pathname === link.path ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  navigate(link.path);
                  
                  // Close sidebar on mobile after navigation
                  const sidebar = document.getElementById("sidebar");
                  if (sidebar && window.innerWidth < 1024) {
                    sidebar.classList.add("-translate-x-full");
                  }
                }}
              >
                <span className="mr-2">{link.icon}</span>
                {link.name}
              </Button>
            ))}
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}`.trim() || user?.email : user?.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 ml-0 lg:ml-64 overflow-auto">
        <div className="container py-6 min-h-full">
          {children}
        </div>
      </div>

      {/* Mobile overlay to close sidebar when clicking outside */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 z-30 opacity-0 pointer-events-none transition-opacity duration-300"
        onClick={() => {
          const sidebar = document.getElementById("sidebar");
          if (sidebar) {
            sidebar.classList.add("-translate-x-full");
          }
        }}
        id="sidebar-overlay"
      ></div>
    </div>
  );
};

export default AppLayout;
