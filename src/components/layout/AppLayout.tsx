import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Book, Calendar, BarChart, Settings, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavLink = { name: string; path: string; icon: React.ReactNode };

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const capitalizeName = (name: string): string => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const greeting = getTimeGreeting();
  const displayName = profile?.first_name ? capitalizeName(profile.first_name.trim()) : "there";
  const showGreeting = location.pathname !== "/statistics" && location.pathname !== "/history" && location.pathname !== "/admin" && location.pathname !== "/prayer";
  const isHistoryOrStats = location.pathname === "/history" || location.pathname === "/statistics";

  const navLinks: NavLink[] = [
    { name: "Reading", path: "/checklist", icon: <Book className="h-5 w-5" /> },
    { name: "Prayer", path: "/prayer", icon: <Heart className="h-5 w-5" /> },
    { name: "History", path: "/history", icon: <Calendar className="h-5 w-5" /> },
    { name: "Stats", path: "/statistics", icon: <BarChart className="h-5 w-5" /> },
  ];

  const desktopLinks = [...navLinks];
  if (isAdmin) desktopLinks.push({ name: "Admin", path: "/admin", icon: <Settings className="h-5 w-5" /> });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 lg:pb-0 lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-r lg:border-stone-200 lg:bg-paper/80 lg:dark:border-stone-800 lg:dark:bg-stone-900/50">
        <div className="flex flex-col flex-1 pt-6 pb-4">
          {/* Desktop: always show greeting in sidebar for all tabs */}
          <div className="px-5 mb-6">
            <p className="text-foreground text-sm font-semibold tracking-tight">{greeting},</p>
            <p className="text-foreground text-lg font-bold truncate">{displayName}</p>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {desktopLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-bible-red text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-100 hover:text-ink dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  )}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content: narrow on mobile, constrained on desktop with sidebar offset */}
      <main
        className={cn(
          "flex-1 w-full max-w-lg mx-auto pt-4 pb-8 px-4 sm:px-6 sm:pt-5 min-w-0 lg:max-w-none lg:pt-6 lg:pb-8",
          isHistoryOrStats ? "lg:pl-[15rem] lg:pr-10" : "lg:pl-[14rem] lg:pr-6"
        )}
      >
        {showGreeting && (
          <p className="text-foreground text-lg font-semibold tracking-tight mb-1.5 sm:text-xl lg:sr-only">
            {greeting}, {displayName}
          </p>
        )}
        {children}
      </main>

      {/* Mobile bottom nav: same links as desktop so admins get Admin too */}
      <nav className="fixed left-1/2 -translate-x-1/2 bg-stone-900 rounded-full px-2 py-2 shadow-2xl z-50 flex items-center gap-0.5 sm:gap-1 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6 lg:hidden">
        {desktopLinks.map((link) => {
          const active = isActive(link.path);
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "flex items-center justify-center p-2.5 sm:p-3 rounded-full transition-all min-w-[44px] min-h-[44px]",
                active ? "bg-stone-800 text-white shadow-lg scale-105" : "text-stone-400 hover:text-white"
              )}
              aria-label={link.name}
            >
              {React.cloneElement(link.icon as React.ReactElement, {
                className: cn("h-5 w-5", active ? "text-white" : "text-stone-400"),
              })}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
