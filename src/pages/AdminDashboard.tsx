import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import MemberManagement from "@/components/admin/MemberManagement";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Book, BookOpen, BarChart as BarChartIcon, UserPlus, Calendar, Search, Lock, Trash2, AlertCircle, Award, ShieldCheck, Database } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Bar
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { bibleBooks } from "@/services/bibleService";
import { fixUserRolesTable } from "@/integrations/supabase/fixUserRoles";

// URL for Supabase API
const SUPABASE_URL = "https://pibjpeltpfqxicozdefd.supabase.co";

type Member = {
  id: string;
  email: string;
  name: string;
  chaptersRead: number;
  lastActive: string;
  streak: number;
  isAdmin: boolean;
};

// Password reset form schema
const passwordFormSchema = z.object({
  newPassword: z.string().min(3, "Password must be at least 3 characters"),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChaptersRead: 0,
    averageCompletion: 0,
    topBooks: [] as { book: string; count: number }[],
    readingProgressByDay: [] as { date: string; count: number }[],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberProgress, setMemberProgress] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isPasswordResetting, setIsPasswordResetting] = useState(false);
  const [passwordMember, setPasswordMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberRoleToToggle, setMemberRoleToToggle] = useState<Member | null>(null);
  const [isTogglingRole, setIsTogglingRole] = useState(false);
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      newPassword: "",
    },
  });
  
  useEffect(() => {
    fetchStats();
    fetchMembers();
    
    // Debug log to help troubleshoot
    console.log("AdminDashboard - Current user:", user);
    console.log("AdminDashboard - Is admin:", isAdmin);
  }, [user, isAdmin]);

  const fetchStats = async () => {
    try {
      console.log("Fetching dashboard stats...");
      
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) {
        console.error("Error fetching users count:", usersError);
        throw usersError;
      }
      
      console.log("Total users count:", totalUsers);
      
      // Get total chapters read
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('completed', true);
      
      if (progressError) {
        console.error("Error fetching completed reading progress:", progressError);
        throw progressError;
      }
      
      console.log("Total completed chapters:", progressData?.length || 0);
      
      const totalChaptersRead = progressData?.length || 0;
      
      // Calculate average completion rate
      const { data: allProgressData, error: allProgressError } = await supabase
        .from('reading_progress')
        .select('*');
        
      if (allProgressError) throw allProgressError;
      
      const totalAssigned = allProgressData?.length || 0;
      const averageCompletion = totalAssigned > 0 
        ? Math.round((totalChaptersRead / totalAssigned) * 100) 
        : 0;
      
      // Get top books
      const { data: topBooksData, error: topBooksError } = await supabase
        .from('reading_progress')
        .select('book')
        .eq('completed', true);
      
      if (topBooksError) throw topBooksError;
      
      // Count occurrences of each book
      const bookCounts: Record<string, number> = {};
      topBooksData?.forEach(item => {
        if (item.book) {
          bookCounts[item.book] = (bookCounts[item.book] || 0) + 1;
        }
      });
      
      // Convert to array and sort by count (descending)
      const topBooks = Object.entries(bookCounts)
        .map(([book, count]) => ({ book, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 books
      
      // Process reading progress data by day
      const readingProgressByDay = progressData
        ?.filter(p => p.completed_at)
        .reduce((acc: { date: string; count: number }[], progress: any) => {
          const date = progress.completed_at?.split('T')[0] || '';
          const existing = acc.find(item => item.date === date);
          if (existing) {
            existing.count++;
          } else if (date) {
            acc.push({ date, count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Last 30 days with data
      
      setStats({
        totalUsers: totalUsers || 0,
        totalChaptersRead,
        averageCompletion,
        topBooks,
        readingProgressByDay: readingProgressByDay || [],
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Failed to fetch statistics",
        description: "There was an error loading dashboard statistics.",
        variant: "destructive",
      });
    }
  };

  const fetchMembers = async () => {
    try {
      console.log("Fetching members data...");
      setIsLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }
      
      console.log("Fetched profiles:", profiles?.length);
      
      // Fetch reading progress stats for each user
      const membersWithStats = await Promise.all(profiles.map(async (profile) => {
        // Get reading stats
        const { data: progressData, error: progressError } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', profile.id);
        
        if (progressError) {
          console.error(`Error fetching reading progress for user ${profile.id}:`, progressError);
          throw progressError;
        }
        
        // Check if user is admin
        let isAdmin = false;
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .single();
          
          if (roleError) {
            if (roleError.code === 'PGRST116') { // No data found
              console.log(`No role found for user ${profile.id}, defaulting to member`);
            } else {
              console.error(`Error fetching role for user ${profile.id}:`, roleError);
            }
          } else {
            isAdmin = roleData?.role === 'admin';
            console.log(`User ${profile.id} role:`, roleData?.role);
          }
        } catch (e) {
          console.error(`Exception fetching role for user ${profile.id}:`, e);
        }
        
        const chaptersRead = progressData?.filter(p => p.completed).length || 0;
        let streak = 0;
        let lastActive = "";
        
        if (progressData && progressData.length > 0) {
          // Find the latest completed chapter
          const latestEntry = progressData
            .filter(p => p.completed)
            .sort((a, b) => 
              new Date(b.completed_at || "").getTime() - 
              new Date(a.completed_at || "").getTime()
            )[0];
          
          if (latestEntry) {
            lastActive = latestEntry.completed_at || "";
            
            // Calculate streak from actual data
            const dates = progressData
              .filter(p => p.completed)
              .map(p => p.completed_at?.split('T')[0])
              .filter(Boolean) as string[];
            
            // Get unique dates
            const uniqueDates = [...new Set(dates)].sort((a, b) => 
              new Date(b).getTime() - new Date(a).getTime()
            );
            
            // Calculate streak (consecutive days)
            if (uniqueDates.length > 0) {
              streak = 1;
              for (let i = 1; i < uniqueDates.length; i++) {
                const prevDate = new Date(uniqueDates[i-1]);
                const currDate = new Date(uniqueDates[i]);
                
                // Check if dates are consecutive
                const diffTime = prevDate.getTime() - currDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                  streak++;
                } else {
                  break;
                }
              }
            }
          }
        }
        
        return {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`.trim() || "Unnamed User",
          email: "", // We'd need a join with auth.users to get this, but that's not accessible via RLS
          chaptersRead,
          lastActive: lastActive || new Date().toISOString(),
          streak,
          isAdmin
        };
      }));
      
      console.log("Processed members data:", membersWithStats.length);
      setMembers(membersWithStats);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Failed to fetch members",
        description: "There was an error loading member data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter members based on search query
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Prepare data for the pie chart
  const pieData = stats.topBooks.map(book => ({
    name: book.book,
    value: book.count,
  }));
  
  const COLORS = ["#6E59A5", "#9b87f5", "#D6BCFA", "#E5DEFF", "#F2FCE2"];

  const openMemberDetail = async (member: Member) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
    // Fetch detailed progress for the member
    const { data: progressData } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', member.id)
      .order('created_at', { ascending: true });
    setMemberProgress(progressData || []);
  };

  const closeMemberDetail = () => {
    setIsDetailOpen(false);
    setSelectedMember(null);
    setMemberProgress([]);
  };
  
  const openPasswordReset = (member: Member) => {
    setPasswordMember(member);
    setIsPasswordResetOpen(true);
    passwordForm.reset();
  };
  
  const closePasswordReset = () => {
    setIsPasswordResetOpen(false);
    setPasswordMember(null);
  };
  
  const resetPassword = async (values: PasswordFormValues) => {
    if (!isAdmin || !passwordMember) {
      return;
    }
    
    setIsPasswordResetting(true);
    
    try {
      // Get admin session for authorization
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("No active session found. Please log in again.");
      }

      const token = sessionData.session.access_token;
      
      // Use Edge Function to reset password
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: passwordMember.id,
          newPassword: values.newPassword
        })
      });
      
      // Parse response
      const responseText = await response.text();
      let data;
      
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response:", e);
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to reset password: ${data?.error || 'Unknown error'}`);
      }
      
      // Success message
      toast({
        title: "Password reset successful",
        description: `Password for ${passwordMember.name} has been updated.`,
      });
      
      closePasswordReset();
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Failed to reset password",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPasswordResetting(false);
    }
  };

  const confirmDeleteMember = (member: Member) => {
    setMemberToDelete(member);
  };

  const cancelDeleteMember = () => {
    setMemberToDelete(null);
  };

  const deleteMember = async () => {
    if (!memberToDelete || !isAdmin) return;
    
    setIsDeleting(true);
    
    try {
      // Get admin session for authorization
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("No active session found. Please log in again.");
      }

      const token = sessionData.session.access_token;
      
      // Use Edge Function to delete member
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: memberToDelete.id })
      });
      
      // Parse response
      const responseText = await response.text();
      let data;
      
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response:", e);
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to delete member: ${data?.error || 'Unknown error'}`);
      }
      
      // Success message
      toast({
        title: "Member deleted successfully",
        description: `${memberToDelete.name} has been removed from the system.`,
      });
      
      // Update the members list by refetching
      fetchMembers();
      
      // Close the dialog
      setMemberToDelete(null);
    } catch (error) {
      console.error("Delete member error:", error);
      toast({
        title: "Failed to delete member",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmToggleAdminRole = (member: Member) => {
    setMemberRoleToToggle(member);
  };

  const cancelToggleAdminRole = () => {
    setMemberRoleToToggle(null);
  };

  const toggleMemberAdminRole = async () => {
    if (!memberRoleToToggle) return;
    
    setIsTogglingRole(true);
    
    try {
      console.log("Toggling admin role for:", memberRoleToToggle.name, memberRoleToToggle.id);
      
      // Check if this is the last admin when trying to demote
      if (memberRoleToToggle.isAdmin) {
        const admins = members.filter(m => m.isAdmin);
        if (admins.length <= 1) {
          throw new Error("Cannot remove the last admin. Please make another user an admin first.");
        }
      }
      
      // Get current role
      const { data: existingRole, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', memberRoleToToggle.id);
      
      if (roleError) {
        console.error("Error checking existing role:", roleError);
        throw roleError;
      }
      
      console.log("Existing role data:", existingRole);
      
      const newRole = memberRoleToToggle.isAdmin ? 'member' : 'admin';
      console.log("Setting new role:", newRole);
      
      if (existingRole && existingRole.length > 0) {
        // Update existing role
        console.log("Updating existing role...");
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', memberRoleToToggle.id);
          
        if (updateError) {
          console.error("Error updating role:", updateError);
          throw updateError;
        }
      } else {
        // Insert new role
        console.log("Inserting new role...");
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: memberRoleToToggle.id, role: newRole });
          
        if (insertError) {
          console.error("Error inserting role:", insertError);
          throw insertError;
        }
      }
      
      // Success message
      toast({
        title: `Role updated successfully`,
        description: `${memberRoleToToggle.name} is now a ${newRole}`,
      });
      
      // Update the members list by refetching
      fetchMembers();
      
      // Close the dialog
      setMemberRoleToToggle(null);
    } catch (error) {
      console.error("Toggle admin role error:", error);
      toast({
        title: "Failed to update role",
        description: "You may not have permission to update roles. Please contact your administrator.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingRole(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permission Denied</CardTitle>
              <CardDescription>
                You need admin privileges to access the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Please contact your administrator if you believe this is an error.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
                <CardDescription>Manage your congregation's reading progress</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => fixUserRolesTable()}>
                <Database className="h-4 w-4" /> Fix Database
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stats" className="space-y-4">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <UserCheck className="mr-2 h-4 w-4 text-primary" />
                        Active Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalUsers}</div>
                      <Progress value={members.filter(m => m.chaptersRead > 0).length / Math.max(stats.totalUsers, 1) * 100} className="h-2 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(members.filter(m => m.chaptersRead > 0).length / Math.max(stats.totalUsers, 1) * 100)}% active this week
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <BookOpen className="mr-2 h-4 w-4 text-primary" />
                        Total Chapters Read
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalChaptersRead}</div>
                      <p className="text-xs text-muted-foreground mt-1">By all members</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-primary" />
                        Completion Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.averageCompletion}%</div>
                      <Progress value={stats.averageCompletion} className="h-2 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">Average completion rate</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Book className="mr-2 h-4 w-4 text-primary" />
                        Most Read Book
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.topBooks.length > 0 ? stats.topBooks[0].book : "None"}</div>
                      <p className="text-xs text-muted-foreground mt-1">{stats.topBooks.length > 0 ? `${stats.topBooks[0].count} chapters read` : "No data available"}</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <Award className="mr-2 h-5 w-5 text-primary" />
                        Top Performers
                      </CardTitle>
                      <CardDescription>
                        Members with highest engagement
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {isLoading ? (
                        <div className="py-6 text-center text-muted-foreground">Loading member data...</div>
                      ) : members.length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground">No members found</div>
                      ) : (
                        <>
                          <div>
                            <div className="text-sm font-medium flex items-center mb-1">
                              <Award className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                              Longest Streak
                            </div>
                            {(() => {
                              const topStreakMember = [...members].sort((a, b) => b.streak - a.streak)[0];
                              
                              return topStreakMember ? (
                                <div className="bg-muted/50 rounded-md p-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{topStreakMember.name}</span>
                                    <span className="text-sm text-primary font-semibold">{topStreakMember.streak} days</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Last active: {topStreakMember.lastActive ? new Date(topStreakMember.lastActive).toLocaleDateString() : "Never"}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No streak data available</div>
                              );
                            })()}
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium flex items-center mb-1">
                              <BookOpen className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                              Most Chapters Read
                            </div>
                            {(() => {
                              const topReadingMember = [...members].sort((a, b) => b.chaptersRead - a.chaptersRead)[0];
                              
                              return topReadingMember ? (
                                <div className="bg-muted/50 rounded-md p-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{topReadingMember.name}</span>
                                    <span className="text-sm text-primary font-semibold">{topReadingMember.chaptersRead} chapters</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {Math.round((topReadingMember.chaptersRead / bibleBooks.reduce((sum, book) => sum + book.chapters, 0)) * 100)}% of Bible completed
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No reading data available</div>
                              );
                            })()}
                          </div>

                          <div>
                            <div className="text-sm font-medium flex items-center mb-1">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                              Most Recent Activity
                            </div>
                            {(() => {
                              // Sort by most recent activity
                              const mostRecentMember = [...members]
                                .filter(m => m.lastActive)
                                .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())[0];
                              
                              return mostRecentMember ? (
                                <div className="bg-muted/50 rounded-md p-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{mostRecentMember.name}</span>
                                    <span className="text-sm text-primary font-semibold">
                                      {new Date(mostRecentMember.lastActive).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {mostRecentMember.chaptersRead} total chapters read
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No recent activity</div>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle>Reading Progress Over Time</CardTitle>
                      <CardDescription>
                        Chapters completed by day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart
                          data={stats.readingProgressByDay}
                          margin={{
                            top: 10,
                            right: 20,
                            left: 20,
                            bottom: 50,
                          }}
                        >
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth()+1}/${date.getDate()}`;
                            }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            label={{ 
                              value: 'Chapters', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle' } 
                            }}
                          />
                          <RechartsTooltip
                            formatter={(value, name) => [`${value} chapters`, 'Completed']}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            name="Chapters" 
                            fill={isDarkMode ? '#6E59A5' : '#9b87f5'} 
                            radius={[4, 4, 0, 0]} 
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle>Most Read Books</CardTitle>
                      <CardDescription>
                        Top books by completion count
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend />
                          <RechartsTooltip
                            formatter={(value) => [`${value} chapters`, 'Read']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="members">
                <Card>
                  <CardHeader>
                    <CardTitle>Member Management</CardTitle>
                    <CardDescription>
                      Add new members and view reading progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <MemberManagement />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Member List</h3>
                        <div className="relative w-64">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search members..." 
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead className="hidden md:table-cell">Progress</TableHead>
                              <TableHead className="hidden md:table-cell">Streak</TableHead>
                              <TableHead className="hidden md:table-cell">Last Active</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">
                                  Loading members...
                                </TableCell>
                              </TableRow>
                            ) : filteredMembers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">
                                  No members found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredMembers.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium">
                                    {member.name}
                                    {member.isAdmin && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Admin
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex items-center space-x-2">
                                      <Progress value={member.chaptersRead > 0 ? 100 : 0} className="h-2 w-32" />
                                      <span className="text-xs text-muted-foreground">{member.chaptersRead} chapters</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {member.streak} days
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {member.lastActive ? new Date(member.lastActive).toLocaleDateString() : "Never"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openPasswordReset(member)}
                                      >
                                        <Lock className="h-3.5 w-3.5 mr-1" />
                                        Password
                                      </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                        onClick={() => openMemberDetail(member)}
                                    >
                                      View
                                    </Button>
                                      <Button
                                        variant={member.isAdmin ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => confirmToggleAdminRole(member)}
                                        className={member.isAdmin ? "bg-purple-600 hover:bg-purple-700" : "border-purple-200 hover:bg-purple-100 hover:text-purple-600"}
                                      >
                                        <ShieldCheck className={`h-3.5 w-3.5 mr-1 ${member.isAdmin ? "text-white" : "text-purple-500"}`} />
                                        {member.isAdmin ? "Admin" : "Make Admin"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => confirmDeleteMember(member)}
                                        className="border-red-200 hover:bg-red-100 hover:text-red-600"
                                        disabled={member.isAdmin}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-1 text-red-500" />
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Member Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={(open) => !open && closeMemberDetail()}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMember?.name}'s Reading Progress</DialogTitle>
              <DialogDescription>
                Detailed reading history and progress for this member
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Chapters Read</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedMember?.chaptersRead || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      out of {bibleBooks.reduce((sum, book) => sum + book.chapters, 0)} total
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedMember?.streak || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      consecutive days
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-2 md:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Active</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-base font-medium">
                      {selectedMember?.lastActive 
                        ? new Date(selectedMember.lastActive).toLocaleDateString() 
                        : "Never"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedMember?.lastActive 
                        ? `${Math.floor((Date.now() - new Date(selectedMember.lastActive).getTime()) / (1000 * 60 * 60 * 24))} days ago` 
                        : "No activity recorded"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5 text-primary" />
                    Recent Activity
                  </h4>
                  {memberProgress.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reading activity found</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {memberProgress
                        .filter(p => p.completed)
                        .sort((a, b) => new Date(b.completed_at || "").getTime() - new Date(a.completed_at || "").getTime())
                        .slice(0, 10)
                        .map((progress, index) => (
                          <div key={index} className="flex justify-between text-sm border-b pb-1">
                            <span className="font-medium">
                              {progress.book} {progress.chapter}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {progress.completed_at 
                                ? new Date(progress.completed_at).toLocaleDateString() 
                                : ""}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1.5 text-primary" />
                    Reading Overview
                  </h4>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {memberProgress.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No reading activity found</p>
                    ) : (
                      <>
                        <div className="text-sm">
                          <span className="font-medium">Most Read Book: </span>
                          {(() => {
                            const bookCounts: Record<string, number> = {};
                            memberProgress
                              .filter(p => p.completed)
                              .forEach(item => {
                                if (item.book) {
                                  bookCounts[item.book] = (bookCounts[item.book] || 0) + 1;
                                }
                              });
                              
                            // Find book with highest count
                            const sortedBooks = Object.entries(bookCounts)
                              .sort((a, b) => b[1] - a[1]);
                              
                            return sortedBooks.length > 0 
                              ? `${sortedBooks[0][0]} (${sortedBooks[0][1]} chapters)` 
                              : "None";
                          })()}
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">Reading Pace: </span>
                          {(() => {
                            const completedEntries = memberProgress.filter(p => p.completed);
                            if (completedEntries.length === 0) return "No data";
                            
                            const dates = completedEntries
                              .map(p => p.completed_at ? new Date(p.completed_at).toISOString().split('T')[0] : null)
                              .filter(Boolean) as string[];
                              
                            const uniqueDates = [...new Set(dates)];
                            
                            if (uniqueDates.length === 0) return "No data";
                            
                            // Sort dates in ascending order
                            uniqueDates.sort();
                            
                            const firstDate = new Date(uniqueDates[0]);
                            const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
                            const daysDiff = Math.max(1, Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                            
                            const chaptersPerDay = (completedEntries.length / daysDiff).toFixed(1);
                            
                            return `${chaptersPerDay} chapters per reading day`;
                          })()}
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">Testament Progress: </span>
                          <div className="mt-1 space-y-1.5">
                            {(['Old Testament', 'New Testament'] as const).map(testament => {
                              const testamentBooks = testament === 'Old Testament' ? bibleBooks.slice(0, 39) : bibleBooks.slice(39);
                              const totalChapters = testamentBooks.reduce((sum, book) => sum + book.chapters, 0);
                              
                              const completedChapters = memberProgress
                                .filter(p => p.completed && 
                                  testamentBooks.some(b => b.name === p.book)
                                ).length;
                                
                              const percentage = Math.round((completedChapters / totalChapters) * 100);
                              
                              return (
                                <div key={testament} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>{testament}</span>
                                    <span>{completedChapters}/{totalChapters} chapters ({percentage}%)</span>
                                  </div>
                                  <Progress value={percentage} className="h-1.5" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Reading Pattern</CardTitle>
                  <CardDescription>
                    Chapters read in the last 14 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={(() => {
                          // Create array for past 14 days
                          const days = [];
                          for (let i = 13; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const dateStr = date.toISOString().split('T')[0];
                            days.push({
                              date: dateStr,
                              display: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                              count: 0
                            });
                          }
                          
                          // Count completed chapters by day
                          memberProgress
                            .filter(p => p.completed && p.completed_at)
                            .forEach(item => {
                              if (!item.completed_at) return;
                              
                              const dateStr = new Date(item.completed_at).toISOString().split('T')[0];
                              const dayEntry = days.find(day => day.date === dateStr);
                              
                              if (dayEntry) {
                                dayEntry.count += 1;
                              }
                            });
                            
                          return days;
                        })()}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <XAxis 
                          dataKey="display" 
                          stroke={isDarkMode ? "#ccc" : "#333"}
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          interval={1}
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis 
                          stroke={isDarkMode ? "#ccc" : "#333"}
                          tick={{ fontSize: 10 }}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                        />
                          <RechartsTooltip 
                          formatter={(value) => [`${value} chapters`, 'Read']}
                            contentStyle={{ 
                              backgroundColor: isDarkMode ? "#333" : "#fff",
                              color: isDarkMode ? "#fff" : "#333",
                            border: isDarkMode ? "1px solid #555" : "1px solid #eee",
                            fontSize: "12px",
                            padding: "8px"
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill={isDarkMode ? "#6E59A5" : "#9b87f5"} 
                          radius={[4, 4, 0, 0]}
                          barSize={8} 
                          />
                      </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
          </DialogContent>
        </Dialog>
        
        {/* Password Reset Dialog */}
        <Dialog open={isPasswordResetOpen} onOpenChange={(open) => !open && closePasswordReset()}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {passwordMember?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(resetPassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closePasswordReset}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPasswordResetting}>
                    {isPasswordResetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && cancelDeleteMember()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                Delete Member
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {memberToDelete?.name}?
                <br /><br />
                This action is permanent and will remove all their reading progress.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={deleteMember} 
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete Member"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Role Toggle Confirmation Dialog */}
        <AlertDialog open={!!memberRoleToToggle} onOpenChange={(open) => !open && cancelToggleAdminRole()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2 text-purple-500" />
                {memberRoleToToggle?.isAdmin ? "Remove Admin Role" : "Assign Admin Role"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {memberRoleToToggle?.isAdmin ? (
                  <>
                    Are you sure you want to remove admin privileges from <strong>{memberRoleToToggle?.name}</strong>?
                    <br /><br />
                    This user will no longer have access to the admin dashboard.
                  </>
                ) : (
                  <>
                    Are you sure you want to make <strong>{memberRoleToToggle?.name}</strong> an admin?
                    <br /><br />
                    This user will gain access to the admin dashboard and full control over the application.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isTogglingRole}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={toggleMemberAdminRole} 
                disabled={isTogglingRole}
                className={memberRoleToToggle?.isAdmin ? "bg-red-500 hover:bg-red-600" : "bg-purple-600 hover:bg-purple-700"}
              >
                {isTogglingRole ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
