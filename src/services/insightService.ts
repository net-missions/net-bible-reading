import { supabase } from "@/integrations/supabase/client";

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
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return (data as any[]).map((i: any) => {
      const reactions = Array.isArray(i.insight_reactions) ? i.insight_reactions : [];
      return {
        ...i,
        profiles: Array.isArray(i.profiles) ? i.profiles[0] : i.profiles,
        reaction_count: reactions.length,
        user_has_reacted: currentUserId ? reactions.some((r: any) => r.user_id === currentUserId) : false
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
