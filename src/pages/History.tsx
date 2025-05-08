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
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchMonthReadings = async () => {
      if (user) {
        setIsLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Get initial empty state for the month
        const readings = getMonthReadings(user.id, year, month);
        setMonthReadings(readings);
        setIsLoading(false);
      }
    };
    
    fetchMonthReadings();
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Reading History</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <span className="text-sm sm:text-base md:text-lg font-medium">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
        
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Monthly Reading Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-3xl mx-auto">
              {/* Calendar header */}
              <div className="grid grid-cols-7 text-center font-medium mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                  <div key={day + idx} className="py-1 sm:py-2 text-xs sm:text-sm">
                    {window.innerWidth > 400 ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx] : day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className={`grid grid-cols-7 gap-0.5 sm:gap-1 ${isLoading ? 'opacity-50' : ''}`}>
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
                            <span className="text-xs sm:text-sm">{format(day, "d")}</span>
                            {completionCount > 0 && (
                              <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
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
              <div className="mt-4 sm:mt-6 flex justify-center flex-wrap">
                <div className="inline-flex flex-wrap justify-center gap-2 sm:gap-4">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-muted rounded mr-1 sm:mr-2"></div>
                    <span className="text-xs sm:text-sm">0 chapters</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent/30 rounded mr-1 sm:mr-2"></div>
                    <span className="text-xs sm:text-sm">1 chapter</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent/60 rounded mr-1 sm:mr-2"></div>
                    <span className="text-xs sm:text-sm">2 chapters</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent rounded mr-1 sm:mr-2"></div>
                    <span className="text-xs sm:text-sm">3 chapters</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-xs sm:text-sm text-muted-foreground py-2 sm:py-4">
          <p>"But grow in the grace and knowledge of our Lord and Savior Jesus Christ." - 2 Peter 3:18</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
