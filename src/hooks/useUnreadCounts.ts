import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadCounts = () => {
  const { user, profile } = useAuth();
  const [unreadPrayers, setUnreadPrayers] = useState(0);
  const [unreadInsights, setUnreadInsights] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchCounts = async () => {
      try {
        // Fetch unread prayers
        let prayersQuery = supabase
          .from("prayers" as any)
          .select("*", { count: "exact", head: true });
        
        prayersQuery = prayersQuery.neq("user_id", user.id);

        if (profile.last_read_prayers_at) {
          prayersQuery = prayersQuery.gt("created_at", profile.last_read_prayers_at);
        }

        const { count: prayersCount, error: prayersError } = await prayersQuery;
        
        if (!prayersError) {
          setUnreadPrayers(prayersCount || 0);
        } else {
          console.error("Error fetching unread prayers count:", prayersError);
        }

        // Fetch unread insights
        let insightsQuery = supabase
          .from("insights" as any)
          .select("*", { count: "exact", head: true });
          
        insightsQuery = insightsQuery.neq("user_id", user.id);

        if (profile.last_read_insights_at) {
          insightsQuery = insightsQuery.gt("created_at", profile.last_read_insights_at);
        }

        const { count: insightsCount, error: insightsError } = await insightsQuery;
        
        if (!insightsError) {
          setUnreadInsights(insightsCount || 0);
        } else {
          console.error("Error fetching unread insights count:", insightsError);
        }

      } catch (error) {
        console.error("Error fetching unread counts:", error);
      }
    };

    fetchCounts();
    
    // Set up an interval or real-time listener if needed, but fetching once on mount 
    // and profile change is usually enough for a simple tab badge until they visit the tab.
  }, [user?.id, profile?.last_read_prayers_at, profile?.last_read_insights_at]);

  return { unreadPrayers, unreadInsights };
};
