
import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getMonthReadings } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const History = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthReadings, setMonthReadings] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (user) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const readings = getMonthReadings(user.id, year, month);
      setMonthReadings(readings);
    }
  }, [user, currentDate]);
  
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Create an array of week rows
  const weeks = [] as Array<Date[]>;
  let week = [] as Date[];
  
  // Add dummy days for the start of the first week
  const firstDayOfWeek = monthStart.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    week.push(new Date(0)); // placeholder
  }
  
  // Add the actual days
  days.forEach(day => {
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    week.push(day);
  });
  
  // Add dummy days for the end of the last week
  while (week.length < 7 && week.length > 0) {
    week.push(new Date(0)); // placeholder
  }
  
  if (week.length > 0) {
    weeks.push(week);
  }
  
  const getColorForCompletionCount = (count: number) => {
    if (count === 0) return "bg-muted hover:bg-muted";
    if (count === 1) return "bg-accent/30 hover:bg-accent/40";
    if (count === 2) return "bg-accent/60 hover:bg-accent/70";
    if (count === 3) return "bg-accent hover:bg-accent/90";
    return "bg-muted hover:bg-muted";
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Reading History</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Monthly Reading Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-3xl mx-auto">
              {/* Calendar header */}
              <div className="grid grid-cols-7 text-center font-medium mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {weeks.flatMap(week =>
                  week.map((day, dayIndex) => {
                    const dateStr = day.getTime() === 0 ? "" : format(day, "yyyy-MM-dd");
                    const completionCount = dateStr ? (monthReadings[dateStr] || 0) : 0;
                    const isValid = day.getTime() !== 0 && isSameMonth(day, currentDate);
                    
                    return (
                      <div
                        key={`${dateStr || `empty-${dayIndex}`}`}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-md relative",
                          isValid
                            ? getColorForCompletionCount(completionCount)
                            : "bg-transparent"
                        )}
                      >
                        {isValid && (
                          <>
                            <span className="text-sm">{format(day, "d")}</span>
                            {completionCount > 0 && (
                              <span className="text-xs mt-1">
                                {completionCount}/3
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Legend */}
              <div className="mt-6 flex justify-center">
                <div className="inline-flex space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-muted rounded mr-2"></div>
                    <span className="text-sm">0 chapters</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-accent/30 rounded mr-2"></div>
                    <span className="text-sm">1 chapter</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-accent/60 rounded mr-2"></div>
                    <span className="text-sm">2 chapters</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-accent rounded mr-2"></div>
                    <span className="text-sm">3 chapters</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>"But grow in the grace and knowledge of our Lord and Savior Jesus Christ." - 2 Peter 3:18</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
