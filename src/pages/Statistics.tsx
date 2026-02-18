import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserReadingStats } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Calendar, BookOpen, BookCheck, Award, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";

const Statistics = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalChaptersRead: 0, streakDays: 0, lastReadDate: null as string | null, completionRate: 0 });
  const [weeklyData, setWeeklyData] = useState<{ day: string; chapters: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) { fetchUserStats(); fetchWeeklyActivity(); }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const s = await getUserReadingStats(user.id);
      setStats(s);
    } catch {} finally { setLoading(false); }
  };

  const fetchWeeklyActivity = async () => {
    if (!user?.id) return;
    try {
      const sevenDaysAgo = subDays(new Date(), 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("reading_progress" as any).select("*").eq("user_id", user.id).eq("completed", true).gte("completed_at", sevenDaysAgo.toISOString());
      
      const weekly = [];
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), 6 - i);
        weekly.push({ day: format(date, "EEE"), date: format(date, "yyyy-MM-dd"), chapters: 0 });
      }
      if (data) {
        (data as any[]).forEach((item: any) => {
          if (item.completed_at) {
            const entry = weekly.find((d) => isSameDay(new Date(d.date), new Date(item.completed_at)));
            if (entry) entry.chapters += 1;
          }
        });
      }
      setWeeklyData(weekly);
    } catch {} finally { setLoading(false); }
  };

  const fill = isDarkMode ? "hsl(var(--primary))" : "hsl(var(--primary))";
  const empty = isDarkMode ? "#333" : "hsl(var(--muted))";

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-header font-semibold text-ink">Your Journey</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-paper rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative h-48 w-48 flex items-center justify-center">
            <svg className="h-full w-full rotate-[-90deg]">
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="transparent"
                stroke="#F5F5F4"
                strokeWidth="12"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="transparent"
                stroke="#A62828"
                strokeWidth="12"
                strokeDasharray={552.92}
                strokeDashoffset={552.92 * (1 - stats.completionRate / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-header font-semibold text-ink">{stats.completionRate}%</span>
            </div>
          </div>
          <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Bible Completed</p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-paper rounded-[2rem] p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-stone-50 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-stone-300" />
            </div>
            <div>
              <p className="text-3xl font-header font-semibold text-ink">{stats.totalChaptersRead}</p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Chapters Read</p>
            </div>
          </Card>

          <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-paper rounded-[2rem] p-6 space-y-4 border border-bible-red-light">
            <div className="h-10 w-10 rounded-xl bg-stone-50 flex items-center justify-center">
              <BarChart className="h-5 w-5 text-bible-red" />
            </div>
            <div>
              <p className="text-3xl font-header font-semibold text-ink">-{stats.streakDays}</p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Schedule Status</p>
            </div>
          </Card>
        </div>

        <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-paper rounded-[2.5rem] p-8 space-y-6 flex flex-col items-center text-center">
          <p className="text-xl font-header font-medium italic text-ink leading-relaxed">
            "Thy word is a lamp unto my feet, and a light unto my path."
          </p>
          <p className="text-bible-red font-bold uppercase tracking-widest text-xs">
            Psalm 119:105
          </p>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Statistics;
