import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getInsights, addInsight, toggleInsightReaction, Insight as InsightType } from "@/services/insightService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Lightbulb, Heart, MessageSquarePlus } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const Insights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<InsightType[]>([]);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setIsLoading(true);
    const data = await getInsights(user?.id);
    setInsights(data);
    setIsLoading(false);
  };

  const handleToggleReaction = async (insightId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to react to an insight.",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setInsights((prev) => 
      prev.map((i) => {
        if (i.id === insightId) {
          const newUserHasReacted = !i.user_has_reacted;
          return {
            ...i,
            user_has_reacted: newUserHasReacted,
            reaction_count: (i.reaction_count || 0) + (newUserHasReacted ? 1 : -1)
          };
        }
        return i;
      })
    );

    const success = await toggleInsightReaction(insightId, user.id);
    if (!success) {
      // Revert on failure
      setInsights((prev) => 
        prev.map((i) => {
          if (i.id === insightId) {
            const revertedUserHasReacted = !i.user_has_reacted;
            return {
              ...i,
              user_has_reacted: revertedUserHasReacted,
              reaction_count: (i.reaction_count || 0) + (revertedUserHasReacted ? 1 : -1)
            };
          }
          return i;
        })
      );
      
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    
    setIsSubmitting(true);
    const success = await addInsight(user.id, content.trim(), isAnonymous);
    
    if (success) {
      toast({
        title: "Insight shared",
        description: "Your spiritual insight has been shared.",
      });
      setContent("");
      setIsAnonymous(false);
      fetchInsights();
    } else {
      toast({
        title: "Error",
        description: "Failed to share your insight. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const groupedInsights = () => {
    const groups: { title: string; items: InsightType[] }[] = [
      { title: "Today", items: [] },
      { title: "Yesterday", items: [] },
      { title: "Earlier This Week", items: [] },
      { title: "Older", items: [] },
    ];

    insights.forEach((insight) => {
      const date = new Date(insight.created_at);
      if (isToday(date)) {
        groups[0].items.push(insight);
      } else if (isYesterday(date)) {
        groups[1].items.push(insight);
      } else if (isThisWeek(date)) {
        groups[2].items.push(insight);
      } else {
        groups[3].items.push(insight);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  };

  return (
    <AppLayout>
      <div className="space-y-8 lg:max-w-2xl lg:mx-auto">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-4xl font-header font-bold text-stone-900 tracking-tight">Spiritual Insights</h1>
          <p className="text-stone-500 text-base leading-relaxed">
            Share what God has been teaching you or reflection from your reading.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="add-insight" className="border-none border-b-0">
            <AccordionTrigger className="hover:no-underline py-0 [&[data-state=open]>div>svg]:text-bible-red">
              <Card className="border-none shadow-none rounded-[1.75rem] bg-stone-50/50 hover:bg-stone-50 transition-colors w-full">
                <CardHeader className="cursor-pointer py-4 px-5">
                  <CardTitle className="text-base font-medium flex items-center justify-center gap-2 text-stone-600 hover:text-stone-900 transition-colors">
                    <MessageSquarePlus className="h-4 w-4 text-bible-red" />
                    Share a spiritual insight
                  </CardTitle>
                </CardHeader>
              </Card>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-0">
              <Card className="border border-stone-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[1.75rem] bg-white">
                <CardContent className="p-5 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea 
                      placeholder="What have you learned from God recently?" 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[120px] resize-none border-stone-200 focus:border-stone-300 rounded-2xl bg-stone-50/50 p-4 text-base placeholder:text-stone-400"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <div className="flex items-center space-x-2 pl-1">
                        <Checkbox 
                          id="anonymous" 
                          checked={isAnonymous} 
                          onCheckedChange={(c) => setIsAnonymous(c as boolean)} 
                          className="data-[state=checked]:bg-stone-800 data-[state=checked]:border-stone-800"
                        />
                        <label 
                          htmlFor="anonymous" 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-stone-600 cursor-pointer select-none"
                        >
                          Post anonymously
                        </label>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={!content.trim() || isSubmitting}
                        className="bg-stone-900 hover:bg-stone-800 text-white rounded-full font-medium px-8 h-11 w-full sm:w-auto shadow-sm transition-all hover:shadow-md"
                      >
                        {isSubmitting ? "Sharing..." : "Share Insight"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-6 pt-2">
          {isLoading ? (
            <div className="py-16 text-center text-stone-400 font-medium animate-pulse">Loading insights...</div>
          ) : insights.length === 0 ? (
            <div className="py-20 px-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-stone-100 rounded-[2rem] bg-stone-50/30">
               <Lightbulb className="h-10 w-10 text-stone-300 mb-4" />
               <h3 className="text-lg font-semibold text-stone-700 mb-1">No insights yet</h3>
               <p className="text-stone-500 text-sm max-w-sm">Be the first to share a spiritual insight with the community.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedInsights().map((group) => (
                <div key={group.title} className="space-y-4">
                  <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest pl-1">{group.title}</h2>
                  <div className="space-y-4">
                    {group.items.map((insight) => (
                      <Card 
                        key={insight.id} 
                        className="border border-stone-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[1.75rem] overflow-hidden bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                      >
                        <CardContent className="p-4 sm:p-5 space-y-3">
                          <p className="text-stone-800 text-[1.02rem] leading-relaxed whitespace-pre-wrap font-medium">
                            "{insight.content}"
                          </p>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                 <span className="text-[10px] font-bold text-stone-500">
                                   {insight.is_anonymous || !insight.profiles?.first_name ? "?" : insight.profiles.first_name.charAt(0)}
                                 </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-stone-600 leading-tight">
                                  {insight.is_anonymous || !insight.profiles?.first_name
                                    ? "Anonymous"
                                    : `${insight.profiles.first_name} ${insight.profiles.last_name || ""}`.trim()}
                                </span>
                                <time className="text-[10px] font-medium text-stone-400 uppercase tracking-tight">
                                   {format(new Date(insight.created_at), "MMM d, yyyy")}
                                </time>
                              </div>
                            </div>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleToggleReaction(insight.id)}
                              className={`h-8 rounded-full flex items-center gap-1.5 transition-all px-2.5 ${
                                insight.user_has_reacted 
                                  ? "text-rose-500 bg-rose-50 hover:bg-rose-100" 
                                  : "text-stone-400 hover:text-rose-500 hover:bg-rose-50"
                              }`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${insight.user_has_reacted ? "fill-current" : ""}`} />
                              {insight.reaction_count && insight.reaction_count > 0 ? (
                                <span className="text-xs font-bold leading-none">{insight.reaction_count}</span>
                              ) : null}
                              <span className="sr-only">Reaction</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Insights;
