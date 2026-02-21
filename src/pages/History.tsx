import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getMonthReadings } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { bibleBooks } from "@/services/bibleService";

const History = () => {
  const { user, profile } = useAuth();
  const [bibleProgress, setBibleProgress] = useState<Record<string, number>>({});
  const [fullProgress, setFullProgress] = useState<Record<string, Record<number, boolean>>>({});
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <AppLayout>
      <div className="space-y-8">
        <h1 className="text-2xl sm:text-4xl font-header font-semibold text-ink">Scripture</h1>

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
