import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type UserRole = "admin" | "member";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
};

const CURRENT_USER_KEY = "nmf_current_user_id";
const CACHED_PROFILE_KEY = "nmf_cached_profile";
const CACHED_ROLE_KEY = "nmf_cached_role";

export const useSupabaseAuth = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Instantly load cached session data to paint the UI immediately
    const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    const cachedProfileStr = localStorage.getItem(CACHED_PROFILE_KEY);
    const cachedRole = localStorage.getItem(CACHED_ROLE_KEY) as UserRole | null;

    if (savedUserId) {
      if (cachedProfileStr && cachedRole) {
        try {
          const parsedProfile = JSON.parse(cachedProfileStr);
          // Set state immediately to skip the loading screen for returning users
          setProfile(parsedProfile);
          setRole(cachedRole);
          // Don't turn off isLoading yet, wait for background refresh to finish (or fail gracefully)
        } catch (e) {
          console.error("Failed to parse cached profile", e);
        }
      }
      
      // 2. Refresh the session in the background
      loadUser(savedUserId, !!cachedProfileStr);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (userId: string, hasCachedData: boolean = false) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        // PGRST116 means 0 rows returned, so the user was deleted from the database.
        // If it's anything else (like a network error), we should keep the user logged in
        // using their cached profile if they have one.
        if (profileError.code === "PGRST116") {
          clearLocalSession();
        } else if (!hasCachedData) {
          // It's a network error, but we don't have a cache, so we must error out
          clearLocalSession();
        } else {
          console.warn("Network error refreshing session, but using cached profile:", profileError);
        }
        setIsLoading(false);
        return;
      }

      const verifiedProfile = profileData as any;
      setProfile(verifiedProfile);
      localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(verifiedProfile));

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId)
        .single();
        
      if (!roleError && roleData) {
        const verifiedRole = (roleData as any).role as UserRole;
        setRole(verifiedRole);
        localStorage.setItem(CACHED_ROLE_KEY, verifiedRole);
      } else if (roleError && roleError.code === "PGRST116") {
        setRole("member");
        localStorage.setItem(CACHED_ROLE_KEY, "member");
      }
      
    } catch (e) {
      if (!hasCachedData) {
         clearLocalSession();
      } else {
         console.warn("Unexpected error refreshing session, maintaining cached session:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalSession = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CACHED_PROFILE_KEY);
    localStorage.removeItem(CACHED_ROLE_KEY);
    setProfile(null);
    setRole(null);
  };

  const login = async (firstName: string, lastName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .ilike("first_name", firstName.trim())
        .ilike("last_name", lastName.trim())
        .single();

      if (error || !data) {
        toast({
          title: "Not found",
          description: "No member found with that name. Please check your name or register.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const profile = data as any;
      
      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", profile.id)
        .single();

      const userRole = ((roleData as any)?.role as UserRole) || "member";
      
      // Create session
      localStorage.setItem(CURRENT_USER_KEY, profile.id);
      localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(CACHED_ROLE_KEY, userRole);
      
      setProfile(profile);
      setRole(userRole);

      if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/checklist");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const capitalizeName = (name: string): string => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const register = async (firstName: string, lastName: string, userRole: UserRole = "member") => {
    setIsLoading(true);
    try {
      const capitalizedFirstName = capitalizeName(firstName.trim());
      const capitalizedLastName = capitalizeName(lastName.trim());

      // Check if name already exists
      const { data: existing } = await supabase
        .from("profiles" as any)
        .select("id")
        .ilike("first_name", capitalizedFirstName)
        .ilike("last_name", capitalizedLastName)
        .single();

      if (existing) {
        toast({
          title: "Already registered",
          description: "A member with that name already exists. Please sign in instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: newProfile, error: profileError } = await supabase
        .from("profiles" as any)
        .insert({ first_name: capitalizedFirstName, last_name: capitalizedLastName } as any)
        .select()
        .single();

      if (profileError || !newProfile) throw profileError || new Error("Failed to create profile");

      const profile = newProfile as any;

      const { error: roleError } = await supabase
        .from("user_roles" as any)
        .insert({ user_id: profile.id, role: userRole } as any);

      if (roleError) throw roleError;

      // Create session
      localStorage.setItem(CURRENT_USER_KEY, profile.id);
      localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(CACHED_ROLE_KEY, userRole);
      
      setProfile(profile);
      setRole(userRole);

      toast({ title: "Welcome!", description: `Welcome to Net Missions Fellowship, ${profile.first_name}!` });

      if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/checklist");
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    clearLocalSession();
    toast({ title: "Signed out" });
    navigate("/login");
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return false;
    try {
      const { error } = await supabase
        .from("profiles" as any)
        .update(updates as any)
        .eq("id", profile.id);

      if (error) throw error;
      
      setProfile((prev) => {
        const updated = prev ? { ...prev, ...updates } : null;
        if (updated) {
          localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
      
      toast({ title: "Profile updated" });
      return true;
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
  };

  return {
    user: profile ? { id: profile.id } : null,
    profile,
    role,
    isAdmin: role === "admin",
    isAuthenticated: !!profile,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };
};
