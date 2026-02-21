import { supabase } from "@/integrations/supabase/client";

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
};

export const getPrayers = async (): Promise<Prayer[]> => {
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
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Typecast because Supabase might return array for joins depending on schema relations
    return (data as any[]).map((p: any) => ({
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
    })) as Prayer[];
  } catch (error) {
    console.error("Error fetching prayers:", error);
    return [];
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
