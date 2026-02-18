import { Suspense, useState, useEffect } from "react";
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
import Index from "./pages/Index";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-sm">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/checklist" />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/setup" element={<Setup />} />
    <Route path="/debug" element={<Debug />} />
    <Route path="/checklist" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
    <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
    <Route path="/stats" element={<Navigate to="/statistics" replace />} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handler = (e: ErrorEvent) => { setError(e.error); };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="bg-destructive text-destructive-foreground p-4 rounded-md max-w-md">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm">{error.message}</p>
          <button className="mt-4 bg-background text-foreground px-4 py-2 rounded-md text-sm" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <ThemeProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm">Loading...</div>}>
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
