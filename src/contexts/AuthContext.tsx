import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useSupabaseAuth, Profile, UserRole } from "@/hooks/useSupabaseAuth";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, role?: UserRole) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authError, setAuthError] = useState<string | null>(null);
  
  try {
    const auth = useSupabaseAuth();
    
    if (authError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 flex-col">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-md max-w-md">
            <h2 className="text-lg font-bold mb-2">Authentication Error</h2>
            <p>{authError}</p>
            <button 
              className="mt-4 bg-background text-foreground px-4 py-2 rounded-md"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <AuthContext.Provider value={auth}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error("Fatal error in AuthProvider:", error);
    setAuthError(error instanceof Error ? error.message : "Unknown authentication error");
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 flex-col">
        <div className="bg-destructive text-destructive-foreground p-4 rounded-md max-w-md">
          <h2 className="text-lg font-bold mb-2">Authentication Error</h2>
          <p>{error instanceof Error ? error.message : "Unknown authentication error"}</p>
          <button 
            className="mt-4 bg-background text-foreground px-4 py-2 rounded-md"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
