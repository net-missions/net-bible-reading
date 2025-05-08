import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserReadingStats } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Calendar, BookOpen, BookCheck, Award } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isSameDay } from "date-fns";

const Statistics = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalChaptersRead: 0,
    streakDays: 0,
    lastReadDate: null as string | null,
    completionRate: 0,
  });
  
  const [weeklyData, setWeeklyData] = useState<{ day: string; chapters: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchWeeklyActivity();
    }
  }, [user]);
  
  const fetchUserStats = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userStats = await getUserReadingStats(user.id);
      setStats({
        totalChaptersRead: userStats.totalChaptersRead,
        streakDays: userStats.streakDays,
        lastReadDate: userStats.lastReadDate,
        completionRate: userStats.completionRate
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWeeklyActivity = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Get the date 7 days ago
      const sevenDaysAgo = subDays(new Date(), 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      // Format for Supabase query
      const startDateStr = sevenDaysAgo.toISOString();
      
      // Get all completed readings for the past 7 days
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', startDateStr)
        .order('completed_at', { ascending: true });
      
      if (error) throw error;
      
      // Prepare the weekly data with all 7 days
      const weeklyActivityData = [];
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), 6 - i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        weeklyActivityData.push({
          day: format(date, 'EEE'),
          date: formattedDate,
          chapters: 0
        });
      }
      
      // Count completed chapters by day
      if (data) {
        data.forEach(item => {
          if (item.completed_at) {
            const completedDate = new Date(item.completed_at);
            const dayEntry = weeklyActivityData.find(day => 
              isSameDay(new Date(day.date), completedDate)
            );
            
            if (dayEntry) {
              dayEntry.chapters += 1;
            }
          }
        });
      }
      
      setWeeklyData(weeklyActivityData);
    } catch (error) {
      console.error("Error fetching weekly activity:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const chartFillColor = isDarkMode ? "#9b87f5" : "#6E59A5";
  const chartEmptyColor = isDarkMode ? "#333" : "#E5DEFF";
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Your Statistics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <BookCheck className="mr-2 h-4 w-4 text-primary" />
                Total Chapters Read
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "Loading..." : stats.totalChaptersRead}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Award className="mr-2 h-4 w-4 text-primary" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "Loading..." : `${stats.streakDays} days`}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                Last Read Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading 
                  ? "Loading..." 
                  : stats.lastReadDate 
                    ? new Date(stats.lastReadDate).toLocaleDateString() 
                    : "Never"}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <BookOpen className="mr-2 h-4 w-4 text-primary" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "Loading..." : `${stats.completionRate}%`}</div>
              <Progress value={stats.completionRate} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Weekly Reading Activity
            </CardTitle>
            <CardDescription>
              Chapters read per day over the last week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading activity data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#444" : "#eee"} />
                    <XAxis 
                      dataKey="day" 
                      stroke={isDarkMode ? "#ccc" : "#333"} 
                    />
                    <YAxis 
                      stroke={isDarkMode ? "#ccc" : "#333"}
                      allowDecimals={false}
                      domain={[0, 'dataMax']}
                      minTickGap={1}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${value} chapters`, 'Read']}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          return format(new Date(payload[0].payload.date), 'MMM d, yyyy');
                        }
                        return label;
                      }}
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? "#333" : "#fff",
                        color: isDarkMode ? "#fff" : "#333",
                        border: isDarkMode ? "1px solid #555" : "1px solid #eee"
                      }} 
                    />
                    <Bar dataKey="chapters" name="Chapters" radius={[4, 4, 0, 0]} fill={chartFillColor}>
                      {weeklyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.chapters > 0 ? chartFillColor : chartEmptyColor} 
                          fillOpacity={entry.chapters > 0 ? 0.8 + (entry.chapters * 0.05) : 0.2}
                        />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>"I have hidden your word in my heart that I might not sin against you." - Psalm 119:11</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Statistics;
