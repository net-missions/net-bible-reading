import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Book, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSetupAndRedirect = async () => {
      try {
        // Check if there are any users in the system
        const { count, error } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        // If no users exist, redirect to setup page
        if (count === 0) {
          navigate("/setup");
        } else {
          // Otherwise redirect to login page
          navigate("/login");
        }
      } catch (error) {
        console.error("Error checking setup status:", error);
        // Default to login if there's an error
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSetupAndRedirect();
  }, [navigate]);

  // Show a loading screen while checking and redirecting
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Book className="h-16 w-16 text-primary animate-pulse mb-4" />
      <h1 className="text-3xl font-bold mb-2">Scripture Stride Tracker</h1>
      {isLoading ? (
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <p className="text-muted-foreground">Loading, please wait...</p>
        </div>
      ) : (
        <p className="text-muted-foreground">Redirecting...</p>
      )}
    </div>
  );
};

export default Index;
