import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bibleBooks, getUserReadingProgress, saveChapterCompletion, getUserReadingStats } from "@/services/bibleService";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Search, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
      
      // Auto-expand books with progress
      const booksWithProgress: Record<string, boolean> = {};
      let hasExpandedABook = false;
      
      // First pass: find books with progress
      for (const bookName in progress) {
        const bookProgress = progress[bookName];
        const hasProgress = Object.values(bookProgress).some(value => value === true);
        
        if (hasProgress) {
          booksWithProgress[bookName] = true;
        }
      }
      
      // If there are books with progress, expand only the first one
      // (we could sort by most progress or most recent, but for simplicity we'll use the first one found)
      const bookToExpand = Object.keys(booksWithProgress)[0];
      if (bookToExpand) {
        setExpandedBooks({ [bookToExpand]: true });
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
                    
                    return (
                      <div 
                        key={book.name} 
                        className={`border rounded-md overflow-hidden bg-card ${hasProgress ? 'border-primary/30' : ''}`}
                      >
                        <div 
                          className={`px-3 sm:px-3 py-2.5 sm:py-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/30 ${hasProgress ? 'bg-primary/5' : ''}`}
                          onClick={() => toggleBookExpansion(book.name)}
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <span className={`font-medium text-sm sm:text-sm ${hasProgress ? 'text-primary' : ''}`}>
                              {book.name}
                            </span>
                            {completedChapters === totalChapters && totalChapters > 0 && (
                              <Badge variant="outline" className="ml-1 py-0 h-5 text-xs">Completed</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 sm:space-x-3">
                            <span className="text-xs sm:text-xs text-muted-foreground">
                              {completedChapters}/{totalChapters}
                            </span>
                            <Progress value={percentage} className="w-20 sm:w-20 h-2 sm:h-2" />
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
