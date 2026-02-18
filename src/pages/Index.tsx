import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { count } = await supabase.from("user_roles" as any).select("*", { count: "exact", head: true });
        navigate(count === 0 ? "/setup" : "/login");
      } catch {
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-bold mb-4 text-red-500">Net Missions Fellowship</h1>
      {isLoading ? (
        <div className="flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" /><p className="text-muted-foreground text-sm">Loading...</p></div>
      ) : (
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      )}
    </div>
  );
};

export default Index;
