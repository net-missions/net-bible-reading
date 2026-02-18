import React, { createContext, useContext } from "react";
import { useSupabaseAuth, Profile, UserRole } from "@/hooks/useSupabaseAuth";

type AuthContextType = {
  user: { id: string } | null;
  profile: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (firstName: string, lastName: string, role?: UserRole) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSupabaseAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
