import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getPrayers, addPrayer, updatePrayer, togglePrayerReaction, addPrayerComment, deletePrayerComment, Prayer as PrayerType } from "@/services/prayerService";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { MessageSquarePlus, Heart, Edit2, X, Check, MessageCircle, Send, Trash2 } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const Prayer = () => {
  const { user } = useAuth();
  const [prayers, setPrayers] = useState<PrayerType[]>([]);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editIsAnonymous, setEditIsAnonymous] = useState(false);
  
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchPrayers();
  }, []);

  const fetchPrayers = async () => {
    setIsLoading(true);
    const data = await getPrayers(user?.id);
    setPrayers(data);
    setIsLoading(false);
  };

  const handleToggleReaction = async (prayerId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to pray for someone.",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setPrayers((prev) => 
      prev.map((p) => {
        if (p.id === prayerId) {
          const newUserHasReacted = !p.user_has_reacted;
          return {
            ...p,
            user_has_reacted: newUserHasReacted,
            reaction_count: (p.reaction_count || 0) + (newUserHasReacted ? 1 : -1)
          };
        }
        return p;
      })
    );

    const success = await togglePrayerReaction(prayerId, user.id);
    if (!success) {
      // Revert on failure
      setPrayers((prev) => 
        prev.map((p) => {
          if (p.id === prayerId) {
            const revertedUserHasReacted = !p.user_has_reacted;
            return {
              ...p,
              user_has_reacted: revertedUserHasReacted,
              reaction_count: (p.reaction_count || 0) + (revertedUserHasReacted ? 1 : -1)
            };
          }
          return p;
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
    const success = await addPrayer(user.id, content.trim(), isAnonymous);
    
    if (success) {
      toast({
        title: "Prayer added",
        description: "Your prayer request has been shared.",
      });
      setContent("");
      setIsAnonymous(false);
      fetchPrayers();
    } else {
      toast({
        title: "Error",
        description: "Failed to submit your prayer request. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const startEditing = (prayer: PrayerType) => {
    setEditingId(prayer.id);
    setEditContent(prayer.content);
    setEditIsAnonymous(prayer.is_anonymous);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() || !user || !editingId) return;
    
    setIsSubmitting(true);
    const success = await updatePrayer(editingId, editContent.trim(), editIsAnonymous);
    
    if (success) {
      toast({
        title: "Prayer updated",
        description: "Your prayer request has been updated.",
      });
      setEditingId(null);
      fetchPrayers();
    } else {
      toast({
        title: "Error",
        description: "Failed to update your prayer request. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const toggleComments = (prayerId: string) => {
    setShowComments(prev => ({ ...prev, [prayerId]: !prev[prayerId] }));
  };

  const handleCommentSubmit = async (prayerId: string) => {
    const text = commentContent[prayerId];
    if (!text?.trim() || !user) return;
    
    setIsSubmittingComment(true);
    const success = await addPrayerComment(prayerId, user.id, text.trim());
    
    if (success) {
      toast({
        title: "Comment added",
        description: "Your comment has been shared.",
      });
      setCommentContent(prev => ({ ...prev, [prayerId]: "" }));
      fetchPrayers();
    } else {
      toast({
        title: "Error",
        description: "Failed to submit comment. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    const success = await deletePrayerComment(commentId);
    if (success) {
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed.",
      });
      fetchPrayers();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const groupedPrayers = () => {
    const groups: { title: string; items: PrayerType[] }[] = [
      { title: "Today", items: [] },
      { title: "Yesterday", items: [] },
      { title: "Earlier This Week", items: [] },
      { title: "Older", items: [] },
    ];

    prayers.forEach((prayer) => {
      const date = new Date(prayer.created_at);
      if (isToday(date)) {
        groups[0].items.push(prayer);
      } else if (isYesterday(date)) {
        groups[1].items.push(prayer);
      } else if (isThisWeek(date)) {
        groups[2].items.push(prayer);
      } else {
        groups[3].items.push(prayer);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  };

  return (
    <AppLayout>
      <div className="space-y-8 lg:max-w-2xl lg:mx-auto">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-4xl font-header font-bold text-stone-900 tracking-tight">Prayer Board</h1>
          <p className="text-stone-500 text-base leading-relaxed">
            Share your prayer requests with the community or post them anonymously.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="add-prayer" className="border-none border-b-0">
            <AccordionTrigger className="hover:no-underline py-0 [&[data-state=open]>div>svg]:text-bible-red">
              <Card className="border-none shadow-none rounded-[1.75rem] bg-stone-50/50 hover:bg-stone-50 transition-colors w-full">
                <CardHeader className="cursor-pointer py-4 px-5">
                  <CardTitle className="text-base font-medium flex items-center justify-center gap-2 text-stone-600 hover:text-stone-900 transition-colors">
                    <MessageSquarePlus className="h-4 w-4 text-bible-red" />
                    Share a prayer request
                  </CardTitle>
                </CardHeader>
              </Card>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-0">
              <Card className="border border-stone-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[1.75rem] bg-white">
                <CardContent className="p-5 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea 
                      placeholder="What would you like us to pray for?" 
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
                        {isSubmitting ? "Sharing..." : "Share Prayer"}
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
            <div className="py-16 text-center text-stone-400 font-medium animate-pulse">Loading prayers...</div>
          ) : prayers.length === 0 ? (
            <div className="py-20 px-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-stone-100 rounded-[2rem] bg-stone-50/30">
               <Heart className="h-10 w-10 text-stone-300 mb-4" />
               <h3 className="text-lg font-semibold text-stone-700 mb-1">No prayer requests yet</h3>
               <p className="text-stone-500 text-sm max-w-sm">Be the first to share a request with the community. Your prayers matter.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedPrayers().map((group) => (
                <div key={group.title} className="space-y-4">
                  <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest pl-1">{group.title}</h2>
                  <div className="space-y-4">
                    {group.items.map((prayer) => (
                      <Card 
                        key={prayer.id} 
                        className="border border-stone-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[1.75rem] overflow-hidden bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                      >
                        <CardContent className="p-4 sm:p-5 space-y-3">
                          {editingId === prayer.id ? (
                            <form onSubmit={handleUpdate} className="space-y-3">
                              <Textarea 
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[100px] resize-none border-stone-200 focus:border-stone-300 rounded-xl bg-stone-50/50 p-3 text-sm"
                                placeholder="Edit your prayer..."
                                autoFocus
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`edit-anon-${prayer.id}`}
                                    checked={editIsAnonymous} 
                                    onCheckedChange={(c) => setEditIsAnonymous(c as boolean)} 
                                    className="h-4 w-4 data-[state=checked]:bg-stone-800 data-[state=checked]:border-stone-800"
                                  />
                                  <label 
                                    htmlFor={`edit-anon-${prayer.id}`}
                                    className="text-xs font-medium text-stone-600 cursor-pointer select-none"
                                  >
                                    Post anonymously
                                  </label>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEditing}
                                    className="h-8 rounded-full px-3 text-stone-500"
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button 
                                    type="submit"
                                    size="sm"
                                    disabled={!editContent.trim() || isSubmitting}
                                    className="h-8 rounded-full px-4 bg-stone-900 text-white"
                                  >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                  </Button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <p className="text-stone-800 text-[1.02rem] leading-relaxed whitespace-pre-wrap font-medium">
                              "{prayer.content}"
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                 <span className="text-[10px] font-bold text-stone-500">
                                   {prayer.is_anonymous || !prayer.profiles?.first_name ? "?" : prayer.profiles.first_name.charAt(0)}
                                 </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-stone-600 leading-tight">
                                  {prayer.is_anonymous || !prayer.profiles?.first_name
                                    ? "Anonymous"
                                    : `${prayer.profiles.first_name} ${prayer.profiles.last_name || ""}`.trim()}
                                </span>
                                <time className="text-[10px] font-medium text-stone-400 uppercase tracking-tight">
                                   {format(new Date(prayer.created_at), "MMM d, yyyy")}
                                </time>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {user && prayer.user_id === user.id && editingId !== prayer.id && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => startEditing(prayer)}
                                  className="h-8 rounded-full flex items-center gap-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all px-2.5"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Edit</span>
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleComments(prayer.id)}
                                className={`h-8 rounded-full flex items-center gap-1.5 transition-all px-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 ${showComments[prayer.id] ? "bg-stone-50 text-stone-900" : ""}`}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                {prayer.comments && prayer.comments.length > 0 ? (
                                  <span className="text-xs font-bold leading-none">{prayer.comments.length}</span>
                                ) : null}
                                <span className="sr-only">Toggle comments</span>
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleReaction(prayer.id)}
                                className={`h-8 rounded-full flex items-center gap-1.5 transition-all px-2.5 ${
                                  prayer.user_has_reacted 
                                    ? "text-rose-500 bg-rose-50 hover:bg-rose-100" 
                                    : "text-stone-400 hover:text-rose-500 hover:bg-rose-50"
                                }`}
                              >
                                <Heart className={`h-3.5 w-3.5 ${prayer.user_has_reacted ? "fill-current" : ""}`} />
                                {prayer.reaction_count && prayer.reaction_count > 0 ? (
                                  <span className="text-xs font-bold leading-none">{prayer.reaction_count}</span>
                                ) : null}
                                <span className="sr-only">Pray for this</span>
                              </Button>
                            </div>
                          </div>

                          {/* Comments Section */}
                          {showComments[prayer.id] && (
                            <div className="mt-4 pt-4 border-t border-stone-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              {prayer.comments && prayer.comments.length > 0 ? (
                                <div className="space-y-3">
                                  {prayer.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3 group/comment bg-stone-50/50 p-3 rounded-2xl">
                                      <div className="h-7 w-7 rounded-full bg-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-bold text-stone-500">
                                          {comment.profiles?.first_name ? comment.profiles.first_name.charAt(0) : "?"}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-stone-700">
                                              {comment.profiles?.first_name 
                                                ? `${comment.profiles.first_name} ${comment.profiles.last_name || ""}`.trim() 
                                                : "User"}
                                            </span>
                                            <span className="text-[10px] text-stone-400 font-medium whitespace-nowrap">
                                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                                            </span>
                                          </div>
                                          {user && comment.user_id === user.id && (
                                            <button 
                                              onClick={() => handleDeleteComment(comment.id)}
                                              className="text-stone-400 hover:text-rose-500 opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 -mr-1"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                        <p className="text-sm text-stone-600 mt-0.5 leading-relaxed break-words">
                                          {comment.content}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <p className="text-xs text-stone-400 font-medium">No comments yet. Be the first to encourage!</p>
                                </div>
                              )}

                              {user ? (
                                <div className="flex gap-2 items-end pt-1">
                                  <Textarea 
                                    value={commentContent[prayer.id] || ""}
                                    onChange={(e) => setCommentContent(prev => ({ ...prev, [prayer.id]: e.target.value }))}
                                    placeholder="Write a comment of encouragement..."
                                    className="min-h-[40px] h-[40px] resize-none border-stone-200 focus:border-stone-300 rounded-2xl bg-white text-sm py-2.5 px-3 flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleCommentSubmit(prayer.id);
                                      }
                                    }}
                                  />
                                  <Button 
                                    onClick={() => handleCommentSubmit(prayer.id)}
                                    disabled={!commentContent[prayer.id]?.trim() || isSubmittingComment}
                                    size="icon"
                                    className="h-10 w-10 shrink-0 rounded-full bg-stone-900 hover:bg-stone-800 text-white shadow-sm"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-center py-2.5 bg-stone-50 rounded-xl border border-stone-100">
                                  <p className="text-xs text-stone-500 font-medium">Sign in to leave a comment</p>
                                </div>
                              )}
                            </div>
                          )}

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

export default Prayer;
