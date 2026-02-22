import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getMonthReadings } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight, FastForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { bibleBooks, saveBookCompletion, saveAdvancedSync } from "@/services/bibleService";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const History = () => {
  const { user, profile } = useAuth();
  const [bibleProgress, setBibleProgress] = useState<Record<string, number>>({});
  const [fullProgress, setFullProgress] = useState<Record<string, Record<number, boolean>>>({});
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncBook, setSyncBook] = useState<string>("Genesis");
  const [syncChapter, setSyncChapter] = useState<string>("1");
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchProgress = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setIsLoading(true);
    try {
      const { data } = await supabase
        .from("reading_progress" as any)
        .select("book, chapter")
        .eq("user_id", user.id)
        .eq("completed", true);
      
      const counts: Record<string, number> = {};
      const full: Record<string, Record<number, boolean>> = {};

      if (data) {
        (data as any[]).forEach(item => {
          counts[item.book] = (counts[item.book] || 0) + 1;
          if (!full[item.book]) full[item.book] = {};
          full[item.book][item.chapter] = true;
        });
      }
      setBibleProgress(counts);
      setFullProgress(full);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user]);

  const handleChapterToggle = async (book: string, chapter: number) => {
    if (!user?.id) return;
    const isCompleted = fullProgress[book]?.[chapter] || false;
    const { error } = await supabase
      .from("reading_progress" as any)
      .upsert({
        user_id: user.id,
        book,
        chapter,
        completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null
      }, { onConflict: "user_id,book,chapter" });

    if (!error) {
      fetchProgress(true);
    }
  };

  const handleCheckAll = async (book: string, chapters: number, check: boolean) => {
    if (!user?.id) return;
    
    // Optimistic update
    setFullProgress(prev => {
      const newFull = { ...prev };
      if (!newFull[book]) newFull[book] = {};
      for (let i = 1; i <= chapters; i++) {
        newFull[book][i] = check;
      }
      return newFull;
    });
    setBibleProgress(prev => ({
      ...prev,
      [book]: check ? chapters : 0
    }));

    const success = await saveBookCompletion(user.id, book, chapters, check);
    
    if (success) {
      fetchProgress(true);
    } else {
      // Revert if error
      fetchProgress(true);
    }
  };

  const selectedSyncBookChapters = bibleBooks.find(b => b.name === syncBook)?.chapters || 1;

  const handleAdvancedSync = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      const success = await saveAdvancedSync(user.id, syncBook, parseInt(syncChapter));
      if (success) {
        toast({
          title: "Schedule Synchronized",
          description: `Your progress has been updated up to ${syncBook} ${syncChapter}.`,
        });
        await fetchProgress(true);
        setIsSyncDialogOpen(false);
      } else {
        toast({
          title: "Sync Failed",
          description: "There was a problem syncing your progress.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center pr-2">
          <h1 className="text-2xl sm:text-4xl font-header font-semibold text-ink">Scripture</h1>
          
          <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-stone-600 rounded-full border-stone-200">
                <FastForward className="h-4 w-4 text-bible-red" />
                <span className="hidden sm:inline">Advance Reading</span>
                <span className="sm:hidden">Advance Reading</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-[425px] border-none rounded-[1.25rem] shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6 sm:p-8 gap-0">
              <DialogHeader className="space-y-2 text-left pb-1 pr-10">
                <DialogTitle className="text-xl font-semibold text-ink">Advance Reading</DialogTitle>
                <DialogDescription className="text-sm text-stone-600 leading-relaxed">
                  Automatically check off all chapters up to your selected point, and uncheck everything after it. Your schedule will start exactly from the next chapter.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-ink">Book</label>
                    <Select value={syncBook} onValueChange={(val) => {
                      setSyncBook(val);
                      setSyncChapter("1");
                    }}>
                      <SelectTrigger className="rounded-xl border-stone-200">
                        <SelectValue placeholder="Select Book" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {bibleBooks.map(book => (
                          <SelectItem key={book.name} value={book.name}>{book.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-28 space-y-2">
                    <label className="text-sm font-medium text-ink">Chapter</label>
                    <Select value={syncChapter} onValueChange={setSyncChapter}>
                      <SelectTrigger className="rounded-xl border-stone-200">
                        <SelectValue placeholder="Chapter" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {Array.from({ length: selectedSyncBookChapters }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-stone-100">
                <Button
                  variant="outline"
                  onClick={() => setIsSyncDialogOpen(false)}
                  className="rounded-xl border-stone-200 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdvancedSync}
                  disabled={isSyncing}
                  className="bg-bible-red hover:bg-bible-red/90 text-white rounded-xl order-1 sm:order-2 w-full sm:w-auto"
                >
                  {isSyncing ? "Syncing..." : "Update Progress"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-stone-400 font-medium">Loading scripture...</div>
          ) : (
            bibleBooks.map((book) => {
              const completedCount = bibleProgress[book.name] || 0;
              const isExpanded = expandedBooks[book.name];
              
              return (
                <div key={book.name} className="space-y-2">
                  <Card 
                    onClick={() => setExpandedBooks(prev => ({ ...prev, [book.name]: !isExpanded }))}
                    className={cn(
                      "border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-paper rounded-[1.25rem] overflow-hidden group hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all cursor-pointer",
                      isExpanded && "shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                    )}
                  >
                    <CardContent className="p-0 flex items-center">
                      <div className={cn(
                        "w-1.5 h-12 m-4 rounded-full transition-colors",
                        completedCount > 0 ? "bg-bible-red/40" : "bg-stone-50 group-hover:bg-bible-red/10"
                      )} />
                      <div className="flex-1 py-6 flex lg:items-center justify-between pr-6">
                        <span className="text-xl font-header font-medium text-ink">{book.name}</span>
                        <div className="flex items-center gap-4">
                          <div className="bg-stone-50 px-3 py-1 rounded-full text-[10px] font-bold text-stone-400">
                            {completedCount} / {book.chapters}
                          </div>
                          <ChevronRight className={cn(
                            "h-5 w-5 text-stone-300 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isExpanded && (
                    <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-paper rounded-[1.25rem] p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-stone-500">Chapters</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckAll(book.name, book.chapters, completedCount < book.chapters);
                          }}
                          className="h-8 text-xs text-bible-red hover:text-bible-red hover:bg-bible-red/10"
                        >
                          {completedCount < book.chapters ? "Check All" : "Uncheck All"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {Array.from({ length: book.chapters }, (_, i) => i + 1).map(chapter => {
                          const isDone = fullProgress[book.name]?.[chapter];
                          return (
                            <button
                              key={chapter}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChapterToggle(book.name, chapter);
                              }}
                              className={cn(
                                "aspect-square rounded-lg text-sm font-medium flex items-center justify-center border select-none outline-none focus:outline-none focus-visible:ring-0",
                                isDone 
                                  ? "bg-bible-red border-bible-red text-white shadow-sm" 
                                  : "bg-white border-stone-100 text-stone-400 hover:border-bible-red/30"
                              )}
                            >
                              {chapter}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
