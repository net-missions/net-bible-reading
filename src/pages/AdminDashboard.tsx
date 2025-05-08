
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCongregationStats } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import MemberManagement from "@/components/admin/MemberManagement";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Book, BookOpen, BarChart, UserPlus, Calendar, Search } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
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

type Member = {
  id: string;
  email: string;
  name: string;
  chaptersRead: number;
  lastActive: string;
  streak: number;
};

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
  
  useEffect(() => {
    // Get stats from service
    setStats(getCongregationStats());
    fetchMembers();
  }, []);

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
            
            // Calculate streak (simplified version)
            streak = Math.floor(Math.random() * 20); // Placeholder for demo
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
                  <div className="text-2xl font-bold">{members.length}</div>
                  <Progress value={92} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">92% active this week</p>
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
                  <p className="text-xs text-muted-foreground mt-1">+124 in the last 7 days</p>
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
                  <div className="text-2xl font-bold">
                    {stats.topBooks.length > 0 ? stats.topBooks[0].book : "None"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.topBooks.length > 0 ? `${stats.topBooks[0].count} chapters` : "No data"}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Member Activity
                  </CardTitle>
                  <CardDescription>
                    Track reading progress of all members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex mb-4">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search members..." 
                        className="pl-10" 
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
                          <TableHead>Chapters Read</TableHead>
                          <TableHead>Streak</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              Loading member data...
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
                              <TableCell>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              </TableCell>
                              <TableCell>{member.chaptersRead}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {member.streak > 0 ? (
                                    <>
                                      <span className="font-medium mr-1">{member.streak}</span> 
                                      <span className="text-xs">days</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Inactive</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{new Date(member.lastActive).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "Member details",
                                      description: `Viewing details for ${member.name}`,
                                    });
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={fetchMembers}>Refresh Data</Button>
                  <Button 
                    onClick={() => {
                      document.querySelector('[data-value="members"]')?.dispatchEvent(
                        new MouseEvent('click', { bubbles: true })
                      );
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Members
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart className="mr-2 h-5 w-5" />
                    Most Read Books
                  </CardTitle>
                  <CardDescription>
                    Top 5 most-read books
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip 
                          formatter={(value, name) => [`${value} chapters`, name]} 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? "#333" : "#fff",
                            color: isDarkMode ? "#fff" : "#333",
                            border: isDarkMode ? "1px solid #555" : "1px solid #eee"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="members">
            <MemberManagement />
          </TabsContent>
        </Tabs>
        
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>"Let the word of Christ dwell in you richly." - Colossians 3:16</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
