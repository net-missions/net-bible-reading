import { supabase } from "@/integrations/supabase/client";

export type InsightComment = {
  id: string;
  insight_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
};

export type Insight = {
  id: string;
  user_id: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
  reaction_count?: number;
  user_has_reacted?: boolean;
  comments?: InsightComment[];
};

export const getInsights = async (currentUserId?: string): Promise<Insight[]> => {
  try {
    const { data, error } = await supabase
      .from("insights" as any)
      .select(`
        id,
        user_id,
        content,
        is_anonymous,
        created_at,
        profiles (
          first_name,
          last_name
        ),
        insight_reactions (
          user_id
        ),
        insight_comments (
          id,
          insight_id,
          user_id,
          content,
          created_at,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return (data as any[]).map((i: any) => {
      const reactions = Array.isArray(i.insight_reactions) ? i.insight_reactions : [];
      let comments = Array.isArray(i.insight_comments) ? i.insight_comments : [];
      
      comments = comments.map((c: any) => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return {
        ...i,
        profiles: Array.isArray(i.profiles) ? i.profiles[0] : i.profiles,
        reaction_count: reactions.length,
        user_has_reacted: currentUserId ? reactions.some((r: any) => r.user_id === currentUserId) : false,
        comments
      };
    }) as Insight[];
  } catch (error) {
    console.error("Error fetching insights:", error);
    return [];
  }
};

export const addInsight = async (userId: string, content: string, isAnonymous: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("insights" as any)
      .insert({
        user_id: userId,
        content,
        is_anonymous: isAnonymous
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error adding insight:", error);
    return false;
  }
};

export const toggleInsightReaction = async (insightId: string, userId: string): Promise<boolean> => {
  try {
    // Check if reaction exists
    const { data: existing, error: checkError } = await supabase
      .from("insight_reactions" as any)
      .select("id")
      .eq("insight_id", insightId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Remove reaction
      const { error: deleteError } = await supabase
        .from("insight_reactions" as any)
        .delete()
        .eq("id", (existing as any).id);
      
      if (deleteError) throw deleteError;
    } else {
      // Add reaction
      const { error: insertError } = await supabase
        .from("insight_reactions" as any)
        .insert({
          insight_id: insightId,
          user_id: userId
        });
      
      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error("Error toggling insight reaction:", error);
    return false;
  }
};

export const updateInsight = async (insightId: string, content: string, isAnonymous: boolean): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("insights" as any)
      .update({
        content,
        is_anonymous: isAnonymous
      })
      .eq("id", insightId)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.error("Insight update failed: No rows updated. This might be due to Row Level Security (RLS) policies.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating insight:", error);
    return false;
  }
};

export const addInsightComment = async (insightId: string, userId: string, content: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("insight_comments" as any)
      .insert({
        insight_id: insightId,
        user_id: userId,
        content
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error adding insight comment:", error);
    return false;
  }
};

export const deleteInsightComment = async (commentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("insight_comments" as any)
      .delete()
      .eq("id", commentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting insight comment:", error);
    return false;
  }
};
