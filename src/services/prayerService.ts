import { supabase } from "@/integrations/supabase/client";

export type PrayerComment = {
  id: string;
  prayer_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
};

export type Prayer = {
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
  comments?: PrayerComment[];
};

export const getPrayers = async (currentUserId?: string): Promise<Prayer[]> => {
  try {
    const { data, error } = await supabase
      .from("prayers" as any)
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
        prayer_reactions (
          user_id
        ),
        prayer_comments (
          id,
          prayer_id,
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
    
    // Typecast because Supabase might return array for joins depending on schema relations
    return (data as any[]).map((p: any) => {
      const reactions = Array.isArray(p.prayer_reactions) ? p.prayer_reactions : [];
      let comments = Array.isArray(p.prayer_comments) ? p.prayer_comments : [];
      
      comments = comments.map((c: any) => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return {
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
        reaction_count: reactions.length,
        user_has_reacted: currentUserId ? reactions.some((r: any) => r.user_id === currentUserId) : false,
        comments
      };
    }) as Prayer[];
  } catch (error) {
    console.error("Error fetching prayers:", error);
    return [];
  }
};

export const togglePrayerReaction = async (prayerId: string, userId: string): Promise<boolean> => {
  try {
    // Check if reaction exists
    const { data: existing, error: checkError } = await supabase
      .from("prayer_reactions" as any)
      .select("id")
      .eq("prayer_id", prayerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Remove reaction
      const { error: deleteError } = await supabase
        .from("prayer_reactions" as any)
        .delete()
        .eq("id", (existing as any).id);
      
      if (deleteError) throw deleteError;
    } else {
      // Add reaction
      const { error: insertError } = await supabase
        .from("prayer_reactions" as any)
        .insert({
          prayer_id: prayerId,
          user_id: userId
        });
      
      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error("Error toggling prayer reaction:", error);
    return false;
  }
};

export const addPrayer = async (userId: string, content: string, isAnonymous: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("prayers" as any)
      .insert({
        user_id: userId,
        content,
        is_anonymous: isAnonymous
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error adding prayer:", error);
    return false;
  }
};
export const updatePrayer = async (prayerId: string, content: string, isAnonymous: boolean): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("prayers" as any)
      .update({
        content,
        is_anonymous: isAnonymous
      })
      .eq("id", prayerId)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.error("Prayer update failed: No rows updated. This might be due to Row Level Security (RLS) policies.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating prayer:", error);
    return false;
  }
};

export const addPrayerComment = async (prayerId: string, userId: string, content: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("prayer_comments" as any)
      .insert({
        prayer_id: prayerId,
        user_id: userId,
        content
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error adding prayer comment:", error);
    return false;
  }
};

export const deletePrayerComment = async (commentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("prayer_comments" as any)
      .delete()
      .eq("id", commentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting prayer comment:", error);
    return false;
  }
};

