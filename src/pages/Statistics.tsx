import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserReadingStats } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Calendar, BookOpen, BookCheck, Award } from "lucide-react";
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isSameDay } from "date-fns";

const Statistics = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Your Statistics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center"><BookCheck className="mr-2 h-4 w-4 text-primary" />Chapters</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{loading ? "..." : stats.totalChaptersRead}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Streak</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{loading ? "..." : `${stats.streakDays}d`}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary" />Last Read</CardTitle></CardHeader><CardContent><div className="text-sm font-bold">{loading ? "..." : stats.lastReadDate ? new Date(stats.lastReadDate).toLocaleDateString() : "Never"}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center"><BookOpen className="mr-2 h-4 w-4 text-primary" />Progress</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{loading ? "..." : `${stats.completionRate}%`}</div><Progress value={stats.completionRate} className="h-2 mt-2" /></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center text-base"><BarChart className="mr-2 h-4 w-4" />Weekly Activity</CardTitle><CardDescription>Chapters per day</CardDescription></CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={weeklyData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#444" : "#eee"} />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(v: any) => [`${v} chapters`, "Read"]} />
                    <Bar dataKey="chapters" radius={[4, 4, 0, 0]} fill={fill}>
                      {weeklyData.map((entry, i) => (<Cell key={i} fill={entry.chapters > 0 ? fill : empty} />))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Statistics;
