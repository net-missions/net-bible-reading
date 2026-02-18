import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Debug = () => {
  const [status, setStatus] = useState<Record<string, string>>({
    supabaseConnection: "Testing...",
    currentUser: localStorage.getItem("nmf_current_user_id") || "None",
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { error } = await supabase.from("profiles" as any).select("count", { count: "exact", head: true });
        setStatus((prev) => ({
          ...prev,
          supabaseConnection: error ? `Error: ${error.message}` : "Connected",
        }));
      } catch (err: any) {
        setStatus((prev) => ({ ...prev, supabaseConnection: `Error: ${err.message}` }));
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-xl mx-auto bg-card rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Debug</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(status).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-4 border-b border-border pb-2">
                <div className="font-medium text-sm">{key}</div>
                <div className="break-all text-sm">{value}</div>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm" onClick={() => window.location.reload()}>
                Refresh
              </button>
              <button className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm" onClick={() => { localStorage.removeItem("nmf_current_user_id"); window.location.href = "/login"; }}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Debug;
