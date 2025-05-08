
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTodayReadings, saveChapterCompletion, BibleChapter, getUserReadingStats } from "@/services/bibleService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, BookCheck, Award } from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const Dashboard = () => {
  const { user } = useAuth();
  const [todayReadings, setTodayReadings] = useState<BibleChapter[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [stats, setStats] = useState({
    totalChaptersRead: 0,
    streakDays: 0,
    lastReadDate: null as string | null,
    completionRate: 0,
  });
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (user) {
      const readings = getTodayReadings(user.id, today);
      setTodayReadings(readings.chapters);
      setCompletedCount(readings.chapters.filter(chapter => chapter.isCompleted).length);
      setStats(getUserReadingStats(user.id));
    }
  }, [user, today]);

  const handleCheckboxChange = (chapter: BibleChapter, checked: boolean) => {
    if (!user) return;

    saveChapterCompletion(user.id, today, chapter.id, checked);
    
    // Update local state
    setTodayReadings(prev => 
      prev.map(c => 
        c.id === chapter.id ? { ...c, isCompleted: checked } : c
      )
    );
    
    setCompletedCount(prev => checked ? prev + 1 : prev - 1);
    
    // Show toast notification
    if (checked) {
      toast({
        title: "Chapter completed",
        description: `Great job completing ${chapter.book} ${chapter.chapter}!`,
      });
    }
    
    // If all chapters are completed, show congratulations
    if (checked && completedCount + 1 === 3) {
      toast({
        title: "Daily reading complete!",
        description: "Amazing! You've completed all your readings for today.",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Today's Reading</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium">
                <BookOpen className="mr-2 h-4 w-4 text-primary" />
                Daily Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}/3</div>
              <Progress value={(completedCount / 3) * 100} className="h-2 mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium">
                <Award className="mr-2 h-4 w-4 text-primary" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.streakDays} days</div>
              <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium">
                <BookCheck className="mr-2 h-4 w-4 text-primary" />
                Total Chapters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChaptersRead}</div>
              <p className="text-xs text-muted-foreground mt-1">Chapters read</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium">
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Of scheduled readings</p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Today's Chapters</CardTitle>
            <CardDescription>
              Mark chapters as completed when you've read them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayReadings.map((chapter) => (
                <div key={chapter.id} className="flex items-start space-x-4">
                  <div className="flex items-center h-12 mt-1">
                    <Checkbox 
                      id={chapter.id} 
                      checked={chapter.isCompleted}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(chapter, checked as boolean)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor={chapter.id}
                      className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {chapter.book} {chapter.chapter}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {chapter.isCompleted ? "Completed" : "Not yet read"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // In a real app, this would open the chapter text or link to a Bible API
                      toast({
                        title: "Read chapter",
                        description: `Opening ${chapter.book} ${chapter.chapter}`,
                      });
                    }}
                  >
                    Read
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reset Progress
            </Button>
            <Button
              onClick={() => {
                // In a real app, this would navigate to tomorrow's reading
                toast({
                  title: "Loading new readings",
                  description: "This would show tomorrow's readings in a real app",
                });
              }}
            >
              Preview Tomorrow
            </Button>
          </CardFooter>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>"Thy word is a lamp unto my feet, and a light unto my path." - Psalm 119:105</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
