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

export const useSupabaseAuth = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUserId) {
      loadUser(savedUserId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profileData) {
        localStorage.removeItem(CURRENT_USER_KEY);
        setIsLoading(false);
        return;
      }

      setProfile(profileData as any);

      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId)
        .single();

      setRole(((roleData as any)?.role as UserRole) || "member");
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
    } finally {
      setIsLoading(false);
    }
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
      localStorage.setItem(CURRENT_USER_KEY, profile.id);
      setProfile(profile);

      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", profile.id)
        .single();

      const userRole = ((roleData as any)?.role as UserRole) || "member";
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

      localStorage.setItem(CURRENT_USER_KEY, profile.id);
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
    localStorage.removeItem(CURRENT_USER_KEY);
    setProfile(null);
    setRole(null);
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
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
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
