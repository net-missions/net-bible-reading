import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bibleBooks, getUserReadingProgress, saveChapterCompletion, getUserReadingStats } from "@/services/bibleService";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Search, ChevronRight, CheckCircle2, ChevronDown } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});

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
      
      // Auto-expand books with progress - find the first incomplete book
      const booksWithProgressOrPartialProgress: Record<string, {completed: boolean, totalChapters: number, completedChapters: number}> = {};
      
      // Analyze all books for progress
      for (const book of bibleBooks) {
        const bookName = book.name;
        const bookProgress = progress[bookName] || {};
        const totalChapters = book.chapters;
        const completedChapters = Object.values(bookProgress).filter(Boolean).length;
        const isCompleted = completedChapters === totalChapters && totalChapters > 0;
        
        if (completedChapters > 0) {
          booksWithProgressOrPartialProgress[bookName] = {
            completed: isCompleted,
            totalChapters,
            completedChapters
          };
        }
      }
      
      // Prioritize books with partial progress (not fully completed)
      const partialProgressBooks = Object.entries(booksWithProgressOrPartialProgress)
        .filter(([_, data]) => !data.completed)
        .sort((a, b) => b[1].completedChapters - a[1].completedChapters);
      
      // If there's a book with partial progress, expand the one with most progress
      if (partialProgressBooks.length > 0) {
        setExpandedBooks({ [partialProgressBooks[0][0]]: true });
      } else {
        // Otherwise expand the first book with any progress
        const bookToExpand = Object.keys(booksWithProgressOrPartialProgress)[0];
        if (bookToExpand) {
          setExpandedBooks({ [bookToExpand]: true });
        }
      }
      
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

    // Update optimistically in the UI
    setReadingProgress(prev => ({
      ...prev,
      [book]: {
        ...prev[book],
        [chapter]: checked
      }
    }));

    // Save to Supabase
    const success = await saveChapterCompletion(user.id, book, chapter, checked);
    
    if (success) {
      // Update stats after successful save
      fetchUserStats();
      
      // Show toast notification
      if (checked) {
        toast({
          title: "Chapter completed",
          description: `Great job completing ${book} ${chapter}!`,
        });
        
        // Check if this completion resulted in completing the book
        const bookData = bibleBooks.find(b => b.name === book);
        if (bookData) {
          const bookProgress = { 
            ...readingProgress[book], 
            [chapter]: checked 
          };
          
          const totalChapters = bookData.chapters;
          const completedChapters = Object.values(bookProgress).filter(Boolean).length;
          
          // If book is now complete
          if (completedChapters === totalChapters) {
            toast({
              title: "Book Completed! 🎉",
              description: `You've completed all chapters in ${book}!`,
            });
            
            // Find the next book with progress but not complete
            const nextBookToOpen = findNextBookToOpen(book);
            if (nextBookToOpen) {
              // Expand the next book and close the current one
              setExpandedBooks({
                [book]: false,
                [nextBookToOpen]: true
              });
            }
          }
        }
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
  
  // Helper to find the next book to open after completing a book
  const findNextBookToOpen = (currentBook: string): string | null => {
    // Find the current book's index
    const currentBookIndex = bibleBooks.findIndex(b => b.name === currentBook);
    if (currentBookIndex === -1) return null;
    
    // Look for the next book that has some progress but is not complete
    for (let i = currentBookIndex + 1; i < bibleBooks.length; i++) {
      const nextBook = bibleBooks[i];
      const bookProgress = readingProgress[nextBook.name] || {};
      const completedChapters = Object.values(bookProgress).filter(Boolean).length;
      
      // If this book has some progress but is not complete, return it
      if (completedChapters > 0 && completedChapters < nextBook.chapters) {
        return nextBook.name;
      }
    }
    
    // If no book with progress is found after the current one,
    // look for any book with partial progress
    for (const book of bibleBooks) {
      // Skip the current book
      if (book.name === currentBook) continue;
      
      const bookProgress = readingProgress[book.name] || {};
      const completedChapters = Object.values(bookProgress).filter(Boolean).length;
      
      // If this book has some progress but is not complete, return it
      if (completedChapters > 0 && completedChapters < book.chapters) {
        return book.name;
      }
    }
    
    // If no book with partial progress is found, return the next book
    if (currentBookIndex < bibleBooks.length - 1) {
      return bibleBooks[currentBookIndex + 1].name;
    }
    
    return null;
  };

  // Calculate total completion stats
  const calculateCompletionStats = () => {
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
  };

  const completionStats = calculateCompletionStats();
  
  const startDate = new Date(2026, 1, 16); // Feb 16, 2026
  const currentDay = Math.max(1, differenceInDays(new Date(), startDate) + 1);
  const chaptersPerDay = 4;

  // Flat list of all chapters in reading order: [{ bookName, chapterNumber }, ...]
  const allChaptersInOrder = React.useMemo(() => {
    const list: { bookName: string; chapterNumber: number }[] = [];
    for (const book of bibleBooks) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        list.push({ bookName: book.name, chapterNumber: ch });
      }
    }
    return list;
  }, []);

  // The 4 chapters for today (same book when they fall in one book, e.g. Genesis 9–12)
  const todaysChapters = React.useMemo(() => {
    const startIndex = (currentDay - 1) * chaptersPerDay;
    return allChaptersInOrder.slice(startIndex, startIndex + chaptersPerDay);
  }, [currentDay, allChaptersInOrder]);

  // All 4 of today's chapters completed?
  const allTodayCompleted = todaysChapters.length > 0 && todaysChapters.every(
    ({ bookName, chapterNumber }) => readingProgress[bookName]?.[chapterNumber]
  );

  // First "Read Ahead" card: fixed — the chapter right after today's 4 (e.g. Genesis 13)
  const readAheadChapter = React.useMemo(() => {
    if (!allTodayCompleted) return null;
    const nextIndex = currentDay * chaptersPerDay;
    return allChaptersInOrder[nextIndex] ?? null;
  }, [allTodayCompleted, currentDay, chaptersPerDay, allChaptersInOrder]);

  // Second card: the chapter after the first (e.g. Genesis 14) — shown only when first is completed
  const readAheadNextChapter = React.useMemo(() => {
    if (!allTodayCompleted || !readAheadChapter) return null;
    const idx = allChaptersInOrder.findIndex(
      (ch) => ch.bookName === readAheadChapter.bookName && ch.chapterNumber === readAheadChapter.chapterNumber
    );
    if (idx === -1) return null;
    return allChaptersInOrder[idx + 1] ?? null;
  }, [allTodayCompleted, readAheadChapter, allChaptersInOrder]);

  // Generate chapter blocks for a book
  const renderChapters = (book: string, chapterCount: number) => {
    const chapters = [];
    for (let i = 1; i <= chapterCount; i++) {
      const isCompleted = readingProgress[book]?.[i] || false;
      chapters.push(
        <div 
          key={`${book}-${i}`} 
          className="inline-flex items-center justify-center w-[45px] h-[45px] sm:w-[50px] sm:h-[50px]"
        >
          <div className="flex items-center space-x-1.5">
            <Checkbox
              id={`${book}-${i}`}
              checked={isCompleted}
              onCheckedChange={(checked) => handleCheckboxChange(book, i, checked === true)}
              className="data-[state=checked]:bg-primary h-5 w-5 sm:h-5 sm:w-5"
            />
            <label
              htmlFor={`${book}-${i}`}
              className={`text-sm sm:text-sm select-none cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
            >
              {i}
            </label>
          </div>
        </div>
      );
    }
    return chapters;
  };
  
  // Filter books based on search query
  const getFilteredBooks = () => {
    return bibleBooks.filter(book => 
      book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  // Check if a book has any progress
  const hasBookProgress = (bookName: string) => {
    const bookProgress = readingProgress[bookName] || {};
    return Object.values(bookProgress).some(value => value === true);
  };
  
  // Check if a book is completely finished
  const isBookCompleted = (bookName: string) => {
    const book = bibleBooks.find(b => b.name === bookName);
    if (!book) return false;
    
    const bookProgress = readingProgress[bookName] || {};
    const completedChapters = Object.values(bookProgress).filter(Boolean).length;
    return completedChapters === book.chapters && book.chapters > 0;
  };
  
  // Toggle book expansion
  const toggleBookExpansion = (bookName: string) => {
    setExpandedBooks(prev => ({
      ...prev,
      [bookName]: !prev[bookName]
    }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header: one context line — Day + date (left), progress (right). Greeting lives in AppLayout above. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-bible-red font-bold tracking-[0.2em] text-[10px] uppercase shrink-0">
              Day {currentDay}
            </span>
            <span className="text-stone-500 font-normal select-none shrink-0" aria-hidden>·</span>
            <time className="font-header font-medium text-base text-ink truncate" dateTime={new Date().toISOString().slice(0, 10)}>
              {format(new Date(), "EEE, MMMM d")}
            </time>
          </div>
          <p className="text-stone-400 text-[13px] font-medium whitespace-nowrap shrink-0">
            {completionStats.completed} / 1189 Read
          </p>
        </div>

        <div className="space-y-4 pt-1">
          {loading ? (
            <div className="py-12 text-center text-stone-400 font-medium">Loading your progress...</div>
          ) : (
            <>
              {todaysChapters.map(({ bookName, chapterNumber }, idx) => (
                <div key={`${bookName}-${chapterNumber}`} className="relative">
                  <Card className="border-none shadow-[0_2px_15px_rgba(0,0,0,0.04)] bg-paper rounded-[1.75rem] overflow-hidden">
                    <CardContent className="p-4 sm:p-6 md:p-7">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em]">Chapter {chapterNumber}</p>
                          <h3 className="text-2xl font-header font-semibold text-[#1a1a1a]">{bookName}</h3>
                        </div>
                        <div 
                          className={cn(
                            "h-9 w-9 rounded-full border border-stone-200 flex items-center justify-center transition-all cursor-pointer",
                            readingProgress[bookName]?.[chapterNumber] 
                              ? "bg-bible-red border-bible-red shadow-[0_2px_8px_rgba(166,40,40,0.3)]" 
                              : "hover:border-stone-300"
                          )}
                          onClick={() => handleCheckboxChange(bookName, chapterNumber, !readingProgress[bookName]?.[chapterNumber])}
                        >
                          {readingProgress[bookName]?.[chapterNumber] && (
                            <div className="h-2.5 w-2.5 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {allTodayCompleted && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 sm:px-5 sm:py-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">All readings completed for today!</p>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                      Continue reading
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                  </div>

                  {readAheadChapter && (
                    <div className="space-y-4">
                      <Card
                        className="border-none shadow-[0_2px_15px_rgba(0,0,0,0.04)] bg-paper rounded-[1.75rem] overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
                        onClick={() => handleCheckboxChange(
                          readAheadChapter.bookName,
                          readAheadChapter.chapterNumber,
                          !readingProgress[readAheadChapter.bookName]?.[readAheadChapter.chapterNumber]
                        )}
                      >
                        <CardContent className="p-4 sm:p-6 md:p-7">
                          <div className="flex justify-between items-center">
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em]">Read ahead</p>
                              <h3 className="text-2xl font-header font-semibold text-[#1a1a1a]">
                                {readAheadChapter.bookName} {readAheadChapter.chapterNumber}
                              </h3>
                            </div>
                            <div
                              className={cn(
                                "h-9 w-9 rounded-full border border-stone-200 flex items-center justify-center transition-all cursor-pointer",
                                readingProgress[readAheadChapter.bookName]?.[readAheadChapter.chapterNumber]
                                  ? "bg-bible-red border-bible-red shadow-[0_2px_8px_rgba(166,40,40,0.3)]"
                                  : "hover:border-stone-300"
                              )}
                            >
                              {readingProgress[readAheadChapter.bookName]?.[readAheadChapter.chapterNumber] && (
                                <div className="h-2.5 w-2.5 bg-white rounded-full" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {readingProgress[readAheadChapter.bookName]?.[readAheadChapter.chapterNumber] && readAheadNextChapter && (
                        <Card
                          className="border-none shadow-[0_2px_15px_rgba(0,0,0,0.04)] bg-paper rounded-[1.75rem] overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
                          onClick={() => handleCheckboxChange(
                            readAheadNextChapter.bookName,
                            readAheadNextChapter.chapterNumber,
                            !readingProgress[readAheadNextChapter.bookName]?.[readAheadNextChapter.chapterNumber]
                          )}
                        >
                          <CardContent className="p-4 sm:p-6 md:p-7">
                            <div className="flex justify-between items-center">
                              <div className="space-y-1.5">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em]">Read ahead</p>
                                <h3 className="text-2xl font-header font-semibold text-[#1a1a1a]">
                                  {readAheadNextChapter.bookName} {readAheadNextChapter.chapterNumber}
                                </h3>
                              </div>
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-full border border-stone-200 flex items-center justify-center transition-all cursor-pointer",
                                  readingProgress[readAheadNextChapter.bookName]?.[readAheadNextChapter.chapterNumber]
                                    ? "bg-bible-red border-bible-red shadow-[0_2px_8px_rgba(166,40,40,0.3)]"
                                    : "hover:border-stone-300"
                                )}
                              >
                                {readingProgress[readAheadNextChapter.bookName]?.[readAheadNextChapter.chapterNumber] && (
                                  <div className="h-2.5 w-2.5 bg-white rounded-full" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Checklist;