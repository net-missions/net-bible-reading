
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Book } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page
    navigate("/login");
  }, [navigate]);

  // Show a loading screen while redirecting
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Book className="h-16 w-16 text-primary animate-pulse mb-4" />
      <h1 className="text-3xl font-bold mb-2">Scripture Stride Tracker</h1>
      <p className="text-muted-foreground">Loading, please wait...</p>
    </div>
  );
};

export default Index;
