import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import MemberManagement from "@/components/admin/MemberManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Book, BookOpen, Calendar, Search, Trash2, AlertCircle, Award, ShieldCheck } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  BarChart as RechartsBarChart, XAxis, YAxis, Bar
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { bibleBooks } from "@/services/bibleService";

type Member = {
  id: string;
  name: string;
  chaptersRead: number;
  lastActive: string;
  streak: number;
  isAdmin: boolean;
};

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0, totalChaptersRead: 0, averageCompletion: 0,
    topBooks: [] as { book: string; count: number }[],
    readingProgressByDay: [] as { date: string; count: number }[],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberProgress, setMemberProgress] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberRoleToToggle, setMemberRoleToToggle] = useState<Member | null>(null);
  const [isTogglingRole, setIsTogglingRole] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchMembers();
  }, [user, isAdmin]);

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase.from("profiles" as any).select("*", { count: "exact", head: true });
      const { data: progressData } = await supabase.from("reading_progress" as any).select("*").eq("completed", true);
      const totalChaptersRead = progressData?.length || 0;
      const { data: allProgress } = await supabase.from("reading_progress" as any).select("*");
      const totalAssigned = allProgress?.length || 0;
      const averageCompletion = totalAssigned > 0 ? Math.round((totalChaptersRead / totalAssigned) * 100) : 0;

      const bookCounts: Record<string, number> = {};
      (progressData as any[])?.forEach((item: any) => { if (item.book) bookCounts[item.book] = (bookCounts[item.book] || 0) + 1; });
      const topBooks = Object.entries(bookCounts).map(([book, count]) => ({ book, count })).sort((a, b) => b.count - a.count).slice(0, 5);

      const readingProgressByDay = (progressData as any[])?.filter((p: any) => p.completed_at)
        .reduce((acc: { date: string; count: number }[], p: any) => {
          const date = p.completed_at?.split("T")[0] || "";
          const existing = acc.find((item) => item.date === date);
          if (existing) existing.count++;
          else if (date) acc.push({ date, count: 1 });
          return acc;
        }, []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-30) || [];

      setStats({ totalUsers: totalUsers || 0, totalChaptersRead, averageCompletion, topBooks, readingProgressByDay });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const { data: profiles } = await supabase.from("profiles" as any).select("id, first_name, last_name");
      if (!profiles) { setIsLoading(false); return; }

      const membersWithStats = await Promise.all((profiles as any[]).map(async (profile: any) => {
        const { data: progressData } = await supabase.from("reading_progress" as any).select("*").eq("user_id", profile.id);
        const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", profile.id).single();

        const chaptersRead = (progressData as any[])?.filter((p: any) => p.completed).length || 0;
        let streak = 0, lastActive = "";

        if (progressData && (progressData as any[]).length > 0) {
          const completed = (progressData as any[]).filter((p: any) => p.completed).sort((a: any, b: any) =>
            new Date(b.completed_at || "").getTime() - new Date(a.completed_at || "").getTime()
          );
          if (completed.length > 0) {
            lastActive = completed[0].completed_at || "";
            const dates = [...new Set(completed.map((p: any) => p.completed_at?.split("T")[0]).filter(Boolean) as string[])].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            if (dates.length > 0) {
              streak = 1;
              for (let i = 1; i < dates.length; i++) {
                const diff = Math.round((new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / (1000 * 60 * 60 * 24));
                if (diff === 1) streak++;
                else break;
              }
            }
          }
        }

        return {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`.trim() || "Unnamed",
          chaptersRead, lastActive: lastActive || new Date().toISOString(), streak,
          isAdmin: (roleData as any)?.role === "admin",
        };
      }));

      setMembers(membersWithStats);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const pieData = stats.topBooks.map((b) => ({ name: b.book, value: b.count }));
  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "#e5e5e5", "#999"];

  const openMemberDetail = async (member: Member) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
    const { data } = await supabase.from("reading_progress" as any).select("*").eq("user_id", member.id).order("created_at", { ascending: true });
    setMemberProgress(data || []);
  };

  const deleteMember = async () => {
    if (!memberToDelete || !isAdmin) return;
    setIsDeleting(true);
    try {
      await supabase.from("reading_progress" as any).delete().eq("user_id", memberToDelete.id);
      await supabase.from("user_roles" as any).delete().eq("user_id", memberToDelete.id);
      await supabase.from("profiles" as any).delete().eq("id", memberToDelete.id);
      toast({ title: "Member deleted", description: `${memberToDelete.name} has been removed.` });
      fetchMembers();
      setMemberToDelete(null);
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMemberAdminRole = async () => {
    if (!memberRoleToToggle) return;
    setIsTogglingRole(true);
    try {
      if (memberRoleToToggle.isAdmin && members.filter((m) => m.isAdmin).length <= 1) {
        throw new Error("Cannot remove the last admin.");
      }
      const newRole = memberRoleToToggle.isAdmin ? "member" : "admin";
      const { data: existing } = await supabase.from("user_roles" as any).select("*").eq("user_id", memberRoleToToggle.id);

      if (existing && (existing as any[]).length > 0) {
        await supabase.from("user_roles" as any).update({ role: newRole } as any).eq("user_id", memberRoleToToggle.id);
      } else {
        await supabase.from("user_roles" as any).insert({ user_id: memberRoleToToggle.id, role: newRole } as any);
      }

      toast({ title: "Role updated", description: `${memberRoleToToggle.name} is now a ${newRole}` });
      fetchMembers();
      setMemberRoleToToggle(null);
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsTogglingRole(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card><CardHeader><CardTitle>Permission Denied</CardTitle><CardDescription>Admin access required.</CardDescription></CardHeader></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Admin Dashboard</CardTitle>
            <CardDescription>Manage your congregation's reading progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><UserCheck className="mr-2 h-4 w-4 text-primary" />Members</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><BookOpen className="mr-2 h-4 w-4 text-primary" />Chapters Read</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.totalChaptersRead}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary" />Completion</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.averageCompletion}%</div><Progress value={stats.averageCompletion} className="h-2 mt-2" /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><Book className="mr-2 h-4 w-4 text-primary" />Top Book</CardTitle></CardHeader>
                    <CardContent><div className="text-lg font-bold">{stats.topBooks[0]?.book || "None"}</div></CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Progress Over Time</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsBarChart data={stats.readingProgressByDay} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip formatter={(v: any) => [`${v} chapters`, "Completed"]} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Most Read Books</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Top Performers</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(() => {
                      const topReader = [...members].sort((a, b) => b.chaptersRead - a.chaptersRead)[0];
                      const topStreak = [...members].sort((a, b) => b.streak - a.streak)[0];
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {topReader && <div className="bg-muted/50 rounded-md p-3"><div className="text-xs text-muted-foreground mb-1">Most Chapters</div><div className="font-medium">{topReader.name}</div><div className="text-sm text-primary">{topReader.chaptersRead} chapters</div></div>}
                          {topStreak && <div className="bg-muted/50 rounded-md p-3"><div className="text-xs text-muted-foreground mb-1">Longest Streak</div><div className="font-medium">{topStreak.name}</div><div className="text-sm text-primary">{topStreak.streak} days</div></div>}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members">
                <Card>
                  <CardHeader><CardTitle>Members</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <MemberManagement />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-base font-medium">Member List</h3>
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                      </div>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead className="hidden md:table-cell">Progress</TableHead>
                              <TableHead className="hidden md:table-cell">Streak</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow><TableCell colSpan={4} className="text-center py-4">Loading...</TableCell></TableRow>
                            ) : filteredMembers.length === 0 ? (
                              <TableRow><TableCell colSpan={4} className="text-center py-4">No members found</TableCell></TableRow>
                            ) : (
                              filteredMembers.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium">
                                    {member.name}
                                    {member.isAdmin && (
                                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                        <ShieldCheck className="h-3 w-3 mr-0.5" />Admin
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground">{member.chaptersRead} chapters</span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">{member.streak}d</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1 flex-wrap">
                                      <Button variant="outline" size="sm" onClick={() => openMemberDetail(member)}>View</Button>
                                      <Button variant={member.isAdmin ? "default" : "outline"} size="sm" onClick={() => setMemberRoleToToggle(member)}>
                                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />{member.isAdmin ? "Admin" : "Make Admin"}
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => setMemberToDelete(member)} disabled={member.isAdmin} className="text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
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
        <Dialog open={isDetailOpen} onOpenChange={(open) => { if (!open) { setIsDetailOpen(false); setSelectedMember(null); setMemberProgress([]); } }}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMember?.name}'s Progress</DialogTitle>
              <DialogDescription>Reading history for this member</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Chapters</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{selectedMember?.chaptersRead || 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Streak</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{selectedMember?.streak || 0}d</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Last Active</CardTitle></CardHeader><CardContent><div className="text-sm font-medium">{selectedMember?.lastActive ? new Date(selectedMember.lastActive).toLocaleDateString() : "Never"}</div></CardContent></Card>
            </div>
            <div className="border rounded-md p-3 mt-2">
              <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
              {memberProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity</p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {memberProgress.filter((p: any) => p.completed).sort((a: any, b: any) => new Date(b.completed_at || "").getTime() - new Date(a.completed_at || "").getTime()).slice(0, 15).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span>{p.book} {p.chapter}</span>
                      <span className="text-xs text-muted-foreground">{p.completed_at ? new Date(p.completed_at).toLocaleDateString() : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!memberToDelete} onOpenChange={(open) => { if (!open) setMemberToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><AlertCircle className="h-5 w-5 mr-2 text-destructive" />Delete Member</AlertDialogTitle>
              <AlertDialogDescription>Delete {memberToDelete?.name}? This removes all their data permanently.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteMember} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Toggle Dialog */}
        <AlertDialog open={!!memberRoleToToggle} onOpenChange={(open) => { if (!open) setMemberRoleToToggle(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{memberRoleToToggle?.isAdmin ? "Remove Admin" : "Make Admin"}</AlertDialogTitle>
              <AlertDialogDescription>{memberRoleToToggle?.isAdmin ? `Remove admin from ${memberRoleToToggle?.name}?` : `Make ${memberRoleToToggle?.name} an admin?`}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isTogglingRole}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={toggleMemberAdminRole} disabled={isTogglingRole}>{isTogglingRole ? "Updating..." : "Confirm"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
