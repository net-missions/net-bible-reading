import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Checklist from "./pages/Checklist";
import History from "./pages/History";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";
import Debug from "./pages/Debug";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && !isAdmin) {
    return <Navigate to="/checklist" />;
  }
  
  return <>{children}</>;
};

// Member only route component
const MemberOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (isAdmin) {
    return <Navigate to="/admin" />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/setup" element={<Setup />} />
    <Route path="/debug" element={<Debug />} />
    <Route 
      path="/" 
      element={<Navigate to="/checklist" />} 
    />
    <Route 
      path="/checklist" 
      element={
        <MemberOnlyRoute>
          <Checklist />
        </MemberOnlyRoute>
      } 
    />
    <Route 
      path="/history" 
      element={
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/statistics" 
      element={
        <ProtectedRoute>
          <Statistics />
        </ProtectedRoute>
      } 
    />
    {/* Redirect old stats path to new statistics path */}
    <Route 
      path="/stats" 
      element={<Navigate to="/statistics" replace />} 
    />
    <Route 
      path="/settings" 
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin" 
      element={
        <ProtectedRoute adminOnly>
          <AdminDashboard />
        </ProtectedRoute>
      } 
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

// Error Boundary component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4 flex-col">
    <div className="bg-destructive text-destructive-foreground p-4 rounded-md max-w-md">
      <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
      <p>{error.message}</p>
      <button 
        className="mt-4 bg-background text-foreground px-4 py-2 rounded-md"
        onClick={() => window.location.reload()}
      >
        Reload App
      </button>
      <div className="mt-2">
        <a 
          href="/debug" 
          className="text-sm underline hover:no-underline"
        >
          Go to Debug Page
        </a>
      </div>
    </div>
  </div>
);

const App = () => {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <ThemeProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
              <AuthProvider>
                <AppRoutes />
                <Toaster />
                <Sonner />
              </AuthProvider>
            </Suspense>
          </ThemeProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
