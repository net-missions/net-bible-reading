
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCongregationStats } from "@/services/bibleService";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Mock members data for the admin view
const mockMembers = [
  { id: "1", name: "John Smith", email: "john@example.com", chaptersRead: 42, lastActive: "2025-05-07", streak: 5 },
  { id: "2", name: "Sarah Johnson", email: "sarah@example.com", chaptersRead: 124, lastActive: "2025-05-08", streak: 14 },
  { id: "3", name: "Michael Brown", email: "michael@example.com", chaptersRead: 67, lastActive: "2025-05-06", streak: 0 },
  { id: "4", name: "Emma Wilson", email: "emma@example.com", chaptersRead: 93, lastActive: "2025-05-08", streak: 9 },
  { id: "5", name: "James Taylor", email: "james@example.com", chaptersRead: 155, lastActive: "2025-05-08", streak: 21 },
  { id: "6", name: "Olivia Martinez", email: "olivia@example.com", chaptersRead: 83, lastActive: "2025-05-04", streak: 3 },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChaptersRead: 0,
    averageCompletion: 0,
    topBooks: [] as { book: string; count: number }[],
  });
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    // Get stats from service
    setStats(getCongregationStats());
  }, []);
  
  // Filter members based on search query
  const filteredMembers = mockMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Prepare data for the pie chart
  const pieData = stats.topBooks.map(book => ({
    name: book.book,
    value: book.count,
  }));
  
  const COLORS = ["#6E59A5", "#9b87f5", "#D6BCFA", "#E5DEFF", "#F2FCE2"];
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of congregation reading activity
          </p>
        </div>
        
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
                    {filteredMembers.map((member) => (
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Export Data</Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Invite members",
                    description: "This would open an invite dialog in a real app",
                  });
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Members
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
        
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>"Let the word of Christ dwell in you richly." - Colossians 3:16</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
