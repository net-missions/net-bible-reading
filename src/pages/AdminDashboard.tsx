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
import { UserCheck, Book, BookOpen, BarChart as BarChartIcon, UserPlus, Calendar, Search, Lock, Trash2, AlertCircle } from "lucide-react";
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

// URL for Supabase API
const SUPABASE_URL = "https://pibjpeltpfqxicozdefd.supabase.co";

type Member = {
  id: string;
  email: string;
  name: string;
  chaptersRead: number;
  lastActive: string;
  streak: number;
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
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      newPassword: "",
    },
  });
  
  useEffect(() => {
    fetchStats();
    fetchMembers();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) throw usersError;
      
      // Get total chapters read
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('completed', true);
      
      if (progressError) throw progressError;
      
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
      
      setStats({
        totalUsers: totalUsers || 0,
        totalChaptersRead,
        averageCompletion,
        topBooks,
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
      setIsLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      
      if (profilesError) throw profilesError;
      
      // Fetch reading progress stats for each user
      const membersWithStats = await Promise.all(profiles.map(async (profile) => {
        // Get reading stats
        const { data: progressData, error: progressError } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', profile.id);
        
        if (progressError) throw progressError;
        
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
          streak
        };
      }));
      
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
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview and management of congregation reading activity
          </p>
        </div>
        
        <Tabs defaultValue="overview">
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
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Reading Progress Over Time</CardTitle>
                  <CardDescription>
                    Chapters completed by day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart
                      data={memberProgress
                        .filter(p => p.completed)
                        .reduce((acc: any[], progress: any) => {
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
                        .slice(-15) // Show last 15 days with activity
                      }
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
              
              <Card>
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
                                    variant="outline"
                                    size="sm"
                                    onClick={() => confirmDeleteMember(member)}
                                    className="border-red-200 hover:bg-red-100 hover:text-red-600"
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
      </div>
      
      {/* Member Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => !open && closeMemberDetail()}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMember?.name}'s Reading Progress</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Chapters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedMember?.chaptersRead || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedMember?.streak || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Last Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {selectedMember?.lastActive 
                      ? new Date(selectedMember.lastActive).toLocaleDateString() 
                      : "Never"}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
              {memberProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reading activity found</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {memberProgress
                    .filter(p => p.completed)
                    .sort((a, b) => new Date(b.completed_at || "").getTime() - new Date(a.completed_at || "").getTime())
                    .slice(0, 10)
                    .map((progress, index) => (
                      <div key={index} className="flex justify-between text-sm border-b pb-1">
                        <span>
                          {progress.book} {progress.chapter}
                        </span>
                        <span className="text-muted-foreground">
                          {progress.completed_at 
                            ? new Date(progress.completed_at).toLocaleDateString() 
                            : ""}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
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
    </AppLayout>
  );
};

export default AdminDashboard;
