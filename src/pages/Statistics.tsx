
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

const Statistics = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalChaptersRead: 0,
    streakDays: 0,
    lastReadDate: null as string | null,
    completionRate: 0,
  });
  
  const [weeklyData, setWeeklyData] = useState<{ day: string; chapters: number }[]>([]);
  
  useEffect(() => {
    if (user) {
      setStats(getUserReadingStats(user.id));
      
      // Generate mock weekly data
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const mockData = days.map(day => ({
        day,
        chapters: Math.floor(Math.random() * 4), // 0-3 chapters per day
      }));
      setWeeklyData(mockData);
    }
  }, [user]);
  
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
              <div className="text-2xl font-bold">{stats.totalChaptersRead}</div>
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
              <div className="text-2xl font-bold">{stats.streakDays} days</div>
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
                {stats.lastReadDate ? new Date(stats.lastReadDate).toLocaleDateString() : "Never"}
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
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
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
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#444" : "#eee"} />
                  <XAxis 
                    dataKey="day" 
                    stroke={isDarkMode ? "#ccc" : "#333"} 
                  />
                  <YAxis 
                    stroke={isDarkMode ? "#ccc" : "#333"}
                    domain={[0, 3]}
                    ticks={[0, 1, 2, 3]} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? "#333" : "#fff",
                      color: isDarkMode ? "#fff" : "#333",
                      border: isDarkMode ? "1px solid #555" : "1px solid #eee"
                    }} 
                  />
                  <Bar dataKey="chapters" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.chapters === 3 ? chartFillColor : chartEmptyColor} 
                        fillOpacity={entry.chapters / 3}
                      />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
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
