import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bibleBooks, getUserReadingProgress, saveChapterCompletion, getUserReadingStats } from "@/services/bibleService";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Search, ChevronRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
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
      <div className="space-y-4 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-2xl font-bold tracking-tight">Bible Reading</h1>
            <p className="text-sm sm:text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM do")}</p>
          </div>
          <div className="bg-muted rounded-md px-3 sm:px-3 py-2 sm:py-2 flex items-center text-sm sm:text-sm">
            <BookOpen className="h-4 w-4 sm:h-4 sm:w-4 mr-2 sm:mr-2 text-primary" />
            <span>{completionStats.completed}/{completionStats.total}</span>
            <span className="mx-2 sm:mx-2 text-muted-foreground">|</span>
            <span>{completionStats.percentage}%</span>
          </div>
        </div>

        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            className="pl-9 sm:pl-9 h-10 sm:h-10 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading your reading progress...</div>
        ) : (
          <Card className="overflow-hidden border-none shadow-sm">
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-190px)] sm:h-[calc(100vh-200px)]">
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-3">
                  {getFilteredBooks().map(book => {
                    const totalChapters = book.chapters;
                    const completedChapters = Object.values(readingProgress[book.name] || {}).filter(Boolean).length;
                    const percentage = Math.round((completedChapters / totalChapters) * 100);
                    const isExpanded = expandedBooks[book.name] || false;
                    const hasProgress = hasBookProgress(book.name);
                    const isCompleted = isBookCompleted(book.name);
                    
                    // Determine the background color based on completion percentage
                    const getBgColor = () => {
                      if (!hasProgress) return '';
                      if (isCompleted) return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                      return 'bg-primary/5 border-primary/30';
                    };
                    
                    return (
                      <div 
                        key={book.name} 
                        className={cn(
                          "border rounded-md overflow-hidden bg-card", 
                          getBgColor()
                        )}
                      >
                        <div 
                          className={cn(
                            "px-3 sm:px-3 py-2.5 sm:py-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/30",
                            isCompleted && "text-green-700 dark:text-green-500"
                          )}
                          onClick={() => toggleBookExpansion(book.name)}
                        >
                          <div className="flex items-center gap-2">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                            ) : (
                              <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            )}
                            <span className={cn(
                              "font-medium text-sm sm:text-sm",
                              isCompleted ? "text-green-700 dark:text-green-500" : (hasProgress ? "text-primary" : "")
                            )}>
                              {book.name}
                            </span>
                            {isCompleted && (
                              <Badge 
                                variant="outline" 
                                className="ml-1 py-0 h-5 text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-500"
                              >
                                Completed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 sm:space-x-3">
                            <span className={cn(
                              "text-xs sm:text-xs",
                              isCompleted ? "text-green-700 dark:text-green-500" : "text-muted-foreground"
                            )}>
                              {completedChapters}/{totalChapters}
                            </span>
                            <Progress 
                              value={percentage} 
                              className={cn(
                                "w-20 sm:w-20 h-2 sm:h-2",
                                isCompleted ? "bg-green-200 dark:bg-green-900/40 [&>div]:bg-green-600 dark:[&>div]:bg-green-500" : ""
                              )}
                            />
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="p-3 sm:p-4 bg-muted/20 border-t">
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 sm:gap-2">
                              {renderChapters(book.name, book.chapters)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Checklist;
