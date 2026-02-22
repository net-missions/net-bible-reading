import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Search, ChevronRight, CheckCircle2, ChevronDown, Flame, CalendarDays, AlertCircle } from "lucide-react";
import { format, differenceInDays, subDays } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { StreakAnimation } from "@/components/ui/StreakAnimation";
import { bibleBooks, getUserReadingProgress, saveChapterCompletion, getUserReadingStats } from "@/services/bibleService";

const Checklist = () => {
  const { user } = useAuth();
  const [readingProgress, setReadingProgress] = useState<Record<string, Record<number, boolean>>>({});
  const [stats, setStats] = useState({
    totalChaptersRead: 0,
    streakDays: 0,
    lastReadDate: null as string | null,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [activeStartIndex, setActiveStartIndex] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user reading progress and stats
  useEffect(() => {
    if (user) {
      fetchReadingProgress();
      fetchUserStats();
    }
  }, [user]);

  const fetchReadingProgress = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const progress = await getUserReadingProgress(user.id);
      setReadingProgress(progress);
      // Auto-expansion logic removed to simplify initial view, 
      // can be re-added if specific book navigation is needed.
    } catch (error) {
      console.error("Error fetching reading progress:", error);
      toast({
        title: "Error",
        description: "Failed to load your reading progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user?.id) return;
    try {
      const userStats = await getUserReadingStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handleCheckboxChange = async (book: string, chapter: number, checked: boolean) => {
    if (!user?.id) return;

    let isDayNewlyCompleted = false;

    if (checked) {
      // Simulate the new progress state
      const nextProgress = {
        ...readingProgress,
        [book]: {
          ...(readingProgress[book] || {}),
          [chapter]: true
        }
      };

      const wasCompleted = todaysChapters.length > 0 && todaysChapters.every(
        ({ bookName, chapterNumber }) => readingProgress[bookName]?.[chapterNumber]
      );
      const newlyCompleted = todaysChapters.length > 0 && todaysChapters.every(
        ({ bookName, chapterNumber }) => nextProgress[bookName]?.[chapterNumber]
      );
      
      if (newlyCompleted && !wasCompleted) {
        isDayNewlyCompleted = true;
      }
    }

    // Update optimistically in the UI
    setReadingProgress(prev => ({
      ...prev,
      [book]: {
        ...prev[book],
        [chapter]: checked
      }
    }));

    if (isDayNewlyCompleted) {
      setShowStreakAnimation(true);
    }

    // Save to Supabase
    const success = await saveChapterCompletion(user.id, book, chapter, checked);
    
    if (success) {
      fetchUserStats();
      if (checked && !isDayNewlyCompleted) {
        toast({
          title: "Chapter completed",
          description: `Great job completing ${book} ${chapter}!`,
        });
      }
    } else {
      // Revert UI if save failed
      setReadingProgress(prev => ({
        ...prev,
        [book]: {
          ...prev[book],
          [chapter]: !checked
        }
      }));
      
      toast({
        title: "Error",
        description: "Failed to save your progress",
        variant: "destructive",
      });
    }
  };

  // Calculate total completion stats
  const completionStats = useMemo(() => {
    let completed = 0;
    let total = 0;
    for (const book of bibleBooks) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        total++;
        if (readingProgress[book.name]?.[chapter]) {
          completed++;
        }
      }
    }
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [readingProgress]);
  
  const startDate = new Date(2026, 1, 16); // Feb 16, 2026
  const currentDay = Math.max(1, differenceInDays(new Date(), startDate) + 1);
  const chaptersPerDay = 4;

  // Flat list of all chapters in reading order
  const allChaptersInOrder = useMemo(() => {
    const list: { bookName: string; chapterNumber: number }[] = [];
    for (const book of bibleBooks) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        list.push({ bookName: book.name, chapterNumber: ch });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    if (!loading && Object.keys(readingProgress).length > 0 && !isInitialized && allChaptersInOrder.length > 0) {
      const firstUnreadIdx = allChaptersInOrder.findIndex(
        (ch) => !readingProgress[ch.bookName]?.[ch.chapterNumber]
      );
      if (firstUnreadIdx !== -1) {
        // Start exactly at the first unread chapter, no floor alignment
        setActiveStartIndex(firstUnreadIdx);
      } else {
        setActiveStartIndex(allChaptersInOrder.length - 1);
      }
      setIsInitialized(true);
    }
  }, [loading, readingProgress, isInitialized, allChaptersInOrder, chaptersPerDay]);

  // Today's chapters
  const todaysChapters = useMemo(() => {
    if (!isInitialized) return [];
    return allChaptersInOrder.slice(activeStartIndex, activeStartIndex + chaptersPerDay);
  }, [isInitialized, activeStartIndex, allChaptersInOrder, chaptersPerDay]);

  // Missed Chapters Logic
  const missedChapters = useMemo(() => {
    // If the schedule is completely dynamic based on progress, "missed chapters"
    // is no longer a concept since you just keep reading the next unread ones.
    return [];
  }, []);

  // Weekly Progress (Last 7 Days)
  const weeklyProgress = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayNum = Math.max(1, differenceInDays(date, startDate) + 1);
      const startIndex = (dayNum - 1) * chaptersPerDay;
      const daysChapters = allChaptersInOrder.slice(startIndex, startIndex + chaptersPerDay);
      
      const isComplete = daysChapters.length > 0 && daysChapters.every(
        ch => readingProgress[ch.bookName]?.[ch.chapterNumber]
      );
      
      days.push({ day: format(date, "EEEEE"), isComplete, dayNum });
    }
    return days;
  }, [currentDay, allChaptersInOrder, readingProgress]);

  const allTodayCompleted = todaysChapters.length > 0 && todaysChapters.every(
    ({ bookName, chapterNumber }) => readingProgress[bookName]?.[chapterNumber]
  );

  // Read Ahead Logic
  const readAheadChapter = useMemo(() => {
    if (!allTodayCompleted) return null;
    const nextIndex = activeStartIndex + chaptersPerDay;
    return allChaptersInOrder[nextIndex] ?? null;
  }, [allTodayCompleted, activeStartIndex, chaptersPerDay, allChaptersInOrder]);

  const readAheadNextChapter = useMemo(() => {
    if (!allTodayCompleted || !readAheadChapter) return null;
    const idx = allChaptersInOrder.findIndex(
      (ch) => ch.bookName === readAheadChapter.bookName && ch.chapterNumber === readAheadChapter.chapterNumber
    );
    if (idx === -1) return null;
    return allChaptersInOrder[idx + 1] ?? null;
  }, [allTodayCompleted, readAheadChapter, allChaptersInOrder]);

  const chapterCard = (
    bookName: string,
    chapterNumber: number,
    label: string,
    onClick: () => void,
    title?: string,
    isMissed: boolean = false
  ) => (
    <Card
      className={cn(
        "border-none shadow-[0_2px_15px_rgba(0,0,0,0.04)] rounded-[1.75rem] overflow-hidden cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
        isMissed ? "bg-orange-50 dark:bg-orange-950/20" : "bg-paper"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6 md:p-7">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-[0.15em]",
              isMissed ? "text-orange-500" : "text-stone-400"
            )}>
              {bookName}
            </p>
            <h3 className="text-xl lg:text-2xl font-header font-semibold text-[#1a1a1a]">
              {title ?? (label.includes("Read ahead") ? `${label}: Chapter ${chapterNumber}` : label)}
            </h3>
          </div>
          <div
            className={cn(
              "h-9 w-9 shrink-0 rounded-full border flex items-center justify-center transition-all",
              readingProgress[bookName]?.[chapterNumber]
                ? "bg-bible-red border-bible-red shadow-[0_2px_8px_rgba(166,40,40,0.3)]"
                : isMissed ? "border-orange-300 bg-white" : "border-stone-200 hover:border-stone-300"
            )}
          >
            {readingProgress[bookName]?.[chapterNumber] && (
              <div className="h-2.5 w-2.5 bg-white rounded-full" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-6 lg:max-w-5xl lg:mx-auto">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-bible-red font-bold tracking-[0.2em] text-[10px] uppercase shrink-0">
                Day {Math.floor(activeStartIndex / chaptersPerDay) + 1}
              </span>
              <span className="text-stone-500 font-normal select-none shrink-0" aria-hidden>·</span>
              <time className="font-header font-medium text-base text-ink truncate">
                {format(new Date(), "EEE, MMMM d")}
              </time>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 fill-current" />
                {stats.streakDays} Day Streak
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-stone-400 font-medium">Loading your progress...</div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">
            <div className="space-y-6">
              
              {/* Missed Chapters Section */}
              {missedChapters.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/50 border border-orange-100">
                     <div className="flex items-center gap-2 text-orange-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-semibold">You have {missedChapters.length} unread chapters</span>
                     </div>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="missed" className="border-none">
                      <AccordionTrigger className="py-2 text-sm text-stone-500 hover:text-stone-800 hover:no-underline">
                        <span>View missed chapters</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                           {missedChapters.slice(0, 6).map((ch) => (
                              <div key={`missed-${ch.bookName}-${ch.chapterNumber}`}>
                                {chapterCard(
                                  ch.bookName,
                                  ch.chapterNumber,
                                  `Missed from Day ${Math.ceil((allChaptersInOrder.findIndex(c => c.bookName === ch.bookName && c.chapterNumber === ch.chapterNumber) / chaptersPerDay) + 1)}`,
                                  () => handleCheckboxChange(ch.bookName, ch.chapterNumber, true),
                                  undefined,
                                  true
                                )}
                              </div>
                           ))}
                           {missedChapters.length > 6 && (
                              <div className="col-span-1 md:col-span-2 text-center py-2 text-xs text-stone-400">
                                + {missedChapters.length - 6} more (check History page)
                              </div>
                           )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Today's Chapters */}
              <div className="space-y-4">
                <h2 className="text-xl font-header font-semibold text-ink">Today's Reading</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaysChapters.map(({ bookName, chapterNumber }) => (
                    <div key={`${bookName}-${chapterNumber}`}>
                      {chapterCard(
                        bookName,
                        chapterNumber,
                        `Chapter ${chapterNumber}`,
                        () =>
                          handleCheckboxChange(
                            bookName,
                            chapterNumber,
                            !readingProgress[bookName]?.[chapterNumber]
                          )
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Read Ahead & Completion (Mobile specific - moved here) */}
              {allTodayCompleted && (
                <>
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 sm:px-5 sm:py-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                      All readings completed for today!
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 py-1 lg:hidden">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                      Continue reading
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                  </div>

                  {readAheadChapter && (
                    <div className="space-y-4 lg:hidden">
                      {chapterCard(
                        readAheadChapter.bookName,
                        readAheadChapter.chapterNumber,
                        "Read ahead",
                        () =>
                          handleCheckboxChange(
                            readAheadChapter!.bookName,
                            readAheadChapter!.chapterNumber,
                            !readingProgress[readAheadChapter!.bookName]?.[readAheadChapter!.chapterNumber]
                          )
                      )}
                      
                      {readingProgress[readAheadChapter.bookName]?.[readAheadChapter.chapterNumber] &&
                        readAheadNextChapter &&
                        chapterCard(
                          readAheadNextChapter.bookName,
                          readAheadNextChapter.chapterNumber,
                          "Read ahead",
                          () =>
                            handleCheckboxChange(
                              readAheadNextChapter!.bookName,
                              readAheadNextChapter!.chapterNumber,
                              !readingProgress[readAheadNextChapter!.bookName]?.[
                                readAheadNextChapter!.chapterNumber
                              ]
                            )
                        )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar (Desktop Right) */}
            <div className="hidden lg:block space-y-6 sticky top-6">
              {/* Weekly Progress Widget */}
               <Card className="border border-stone-100 shadow-sm bg-white overflow-hidden">
                 <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                       <CalendarDays className="h-4 w-4 text-stone-400" />
                       <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Last 7 Days</span>
                    </div>
                    <div className="flex justify-between items-center">
                       {weeklyProgress.map((day, i) => (
                          <div key={i} className="flex flex-col items-center gap-2">
                             <div 
                              className={cn(
                                "h-8 w-1.5 rounded-full transition-all", 
                                day.isComplete ? "bg-emerald-500" : (day.dayNum === currentDay ? "bg-stone-200" : "bg-stone-100")
                              )} 
                              title={`Day ${day.dayNum}`}
                             />
                             <span className="text-[10px] font-medium text-stone-400">{day.day}</span>
                          </div>
                       ))}
                    </div>
                 </CardContent>
               </Card>

              {/* Overall Progress */}
              <Card className="border border-stone-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      Year Overview
                    </p>
                    <span className="text-xs font-bold text-stone-600">{completionStats.percentage}%</span>
                  </div>
                  <Progress value={completionStats.percentage} className="h-1.5 bg-stone-100" />
                  <p className="mt-3 text-2xl font-bold text-ink">
                    {completionStats.completed}
                    <span className="text-stone-400 font-normal text-base"> / 1189</span>
                  </p>
                </CardContent>
              </Card>

              {/* Read Ahead (Sidebar) */}
              {allTodayCompleted && readAheadChapter && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Ready for more?
                  </p>
                  {chapterCard(
                    readAheadChapter.bookName,
                    readAheadChapter.chapterNumber,
                    "Read ahead",
                    () =>
                      handleCheckboxChange(
                        readAheadChapter!.bookName,
                        readAheadChapter!.chapterNumber,
                        !readingProgress[readAheadChapter!.bookName]?.[readAheadChapter!.chapterNumber]
                      )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <StreakAnimation
          streak={stats.streakDays}
          isOpen={showStreakAnimation}
          onClose={() => setShowStreakAnimation(false)}
        />
      </div>
    </AppLayout>
  );
};

export default Checklist;