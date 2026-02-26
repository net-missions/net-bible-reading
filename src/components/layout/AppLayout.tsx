import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Book, Clock, BarChart, Settings, HandHeart, Sparkles, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavLink = { name: string; path: string; icon: React.ReactNode };



const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHistoryOrStats = location.pathname === "/history" || location.pathname === "/statistics";

  const navLinks: NavLink[] = [
    { name: "Reading", path: "/checklist", icon: <Book className="h-6 w-6" strokeWidth={2.5} /> },
    { name: "Bible", path: "/bible", icon: <BookOpen className="h-6 w-6" strokeWidth={2.5} /> },
    { name: "Prayer", path: "/prayer", icon: <HandHeart className="h-6 w-6" strokeWidth={2.5} /> },
    { name: "Insights", path: "/insights", icon: <Sparkles className="h-6 w-6" strokeWidth={2.5} /> },
    { name: "History", path: "/history", icon: <Clock className="h-6 w-6" strokeWidth={2.5} /> },
    { name: "Stats", path: "/statistics", icon: <BarChart className="h-6 w-6" strokeWidth={2.5} /> },
  ];

  const desktopLinks = [...navLinks];
  if (isAdmin) desktopLinks.push({ name: "Admin", path: "/admin", icon: <Settings className="h-6 w-6" strokeWidth={2.5} /> });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0 lg:flex-row pt-[env(safe-area-inset-top)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-r lg:border-stone-200 lg:bg-paper/80 lg:dark:border-stone-800 lg:dark:bg-stone-900/50">
        <div className="flex flex-col flex-1 pt-6 pb-4">
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
        {children}
      </main>

      {/* Mobile bottom nav: Icons with labels */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-1 sm:px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.08)] z-50 flex justify-around items-center lg:hidden">
        {desktopLinks.map((link) => {
          const active = isActive(link.path);
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-0 flex-1 rounded-lg transition-colors",
                active ? "text-bible-red" : "text-stone-800 hover:text-stone-600"
              )}
              aria-label={link.name}
            >
              {React.cloneElement(link.icon as React.ReactElement, {
                className: cn(
                  "h-6 w-6 transition-colors",
                  active ? "text-bible-red" : "text-stone-800"
                ),
              })}
              <span className={cn(
                "text-[10px] font-semibold leading-tight",
                active ? "text-bible-red" : "text-stone-800"
              )}>
                {link.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
