import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Debug = () => {
  const [status, setStatus] = useState<Record<string, any>>({
    supabaseConnection: "Testing...",
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "URL not available",
    authStatus: "Checking...",
    browser: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString()
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // Test connection to Supabase
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        if (error) {
          setStatus(prev => ({
            ...prev,
            supabaseConnection: `Error: ${error.message}`,
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            supabaseConnection: "Connected successfully",
          }));
        }

        // Check auth status
        const { data: authData } = await supabase.auth.getSession();
        setStatus(prev => ({
          ...prev,
          authStatus: authData.session ? `Logged in as: ${authData.session.user.email}` : "Not logged in",
        }));

      } catch (err) {
        setStatus(prev => ({
          ...prev,
          supabaseConnection: `Error: ${err instanceof Error ? err.message : String(err)}`,
        }));
      } finally {
        setLoading(false);
      }
    };

    checkSupabase();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-xl mx-auto bg-card rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">System Debug</h1>
        
        {loading ? (
          <div className="py-4">Loading diagnostic information...</div>
        ) : (
          <>
            <div className="space-y-4">
              {Object.entries(status).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4 border-b border-border pb-2">
                  <div className="font-medium">{key}</div>
                  <div className="break-all">{value}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold">Actions</h2>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
                
                <button 
                  className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                >
                  Sign Out
                </button>
                
                <button 
                  className="bg-muted text-muted-foreground px-3 py-2 rounded-md text-sm"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                >
                  Clear LocalStorage
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Debug; 