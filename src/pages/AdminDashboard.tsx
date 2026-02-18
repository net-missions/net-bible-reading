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
import { UserCheck, Book, BookOpen, Calendar, Search, Trash2, AlertCircle, Award, ShieldCheck, Activity, TrendingUp } from "lucide-react";
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
  lastActive: string | null;
  streak: number;
  isAdmin: boolean;
};

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChaptersRead: 0,
    uniqueBooksRead: 0,
    topBooks: [] as { book: string; count: number }[],
    readingProgressByDay: [] as { date: string; count: number }[],
    weekdayCounts: [] as { day: string; count: number }[],
    chaptersLast7Days: 0,
    chaptersPrev7Days: 0,
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

      const bookCounts: Record<string, number> = {};
      (progressData as any[])?.forEach((item: any) => { if (item.book) bookCounts[item.book] = (bookCounts[item.book] || 0) + 1; });
      const uniqueBooksRead = Object.keys(bookCounts).length;
      const topBooks = Object.entries(bookCounts).map(([book, count]) => ({ book, count })).sort((a, b) => b.count - a.count).slice(0, 5);

      const readingProgressByDay = (progressData as any[])?.filter((p: any) => p.completed_at)
        .reduce((acc: { date: string; count: number }[], p: any) => {
          const date = p.completed_at?.split("T")[0] || "";
          const existing = acc.find((item) => item.date === date);
          if (existing) existing.count++;
          else if (date) acc.push({ date, count: 1 });
          return acc;
        }, []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-30) || [];

      const now = new Date();
      const startLast7 = new Date(now);
      startLast7.setDate(now.getDate() - 6);
      startLast7.setHours(0, 0, 0, 0);
      const startPrev7 = new Date(startLast7);
      startPrev7.setDate(startLast7.getDate() - 7);
      const endPrev7 = new Date(startLast7);
      endPrev7.setMilliseconds(-1);

      const completedWithDates = ((progressData as any[]) || []).filter((p: any) => p.completed_at);
      const chaptersLast7Days = completedWithDates.filter((p: any) => new Date(p.completed_at).getTime() >= startLast7.getTime()).length;
      const chaptersPrev7Days = completedWithDates.filter((p: any) => {
        const t = new Date(p.completed_at).getTime();
        return t >= startPrev7.getTime() && t <= endPrev7.getTime();
      }).length;

      const last30Start = new Date(now);
      last30Start.setDate(now.getDate() - 29);
      last30Start.setHours(0, 0, 0, 0);
      const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekdayCountsMap = new Map<string, number>(weekdayOrder.map((d) => [d, 0]));
      completedWithDates.forEach((p: any) => {
        const d = new Date(p.completed_at);
        if (d.getTime() < last30Start.getTime()) return;
        const key = weekdayOrder[d.getDay()];
        weekdayCountsMap.set(key, (weekdayCountsMap.get(key) || 0) + 1);
      });
      const weekdayCounts = weekdayOrder.map((day) => ({ day, count: weekdayCountsMap.get(day) || 0 }));

      setStats({
        totalUsers: totalUsers || 0,
        totalChaptersRead,
        uniqueBooksRead,
        topBooks,
        readingProgressByDay,
        weekdayCounts,
        chaptersLast7Days,
        chaptersPrev7Days,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const capitalizeName = (name: string): string => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
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
        let streak = 0;
        let lastActive: string | null = null;

        if (progressData && (progressData as any[]).length > 0) {
          const completed = (progressData as any[]).filter((p: any) => p.completed).sort((a: any, b: any) =>
            new Date(b.completed_at || "").getTime() - new Date(a.completed_at || "").getTime()
          );
          if (completed.length > 0) {
            lastActive = completed[0].completed_at || null;
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

        const firstName = capitalizeName(profile.first_name || "");
        const lastName = capitalizeName(profile.last_name || "");
        const fullName = `${firstName} ${lastName}`.trim() || "Unnamed";

        return {
          id: profile.id,
          name: fullName,
          chaptersRead,
          lastActive,
          streak,
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

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const daysSince = (iso: string | null) => {
    if (!iso) return Number.POSITIVE_INFINITY;
    const now = startOfDay(new Date());
    const then = startOfDay(new Date(iso));
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  };

  const active7Count = members.filter((m) => daysSince(m.lastActive) <= 6).length;
  const active30Count = members.filter((m) => daysSince(m.lastActive) <= 29).length;
  const inactive14Members = [...members]
    .filter((m) => daysSince(m.lastActive) >= 14)
    .sort((a, b) => daysSince(b.lastActive) - daysSince(a.lastActive));

  const avgChaptersPerMember = members.length > 0 ? Math.round((members.reduce((sum, m) => sum + m.chaptersRead, 0) / members.length) * 10) / 10 : 0;
  const avgStreak = members.filter((m) => m.chaptersRead > 0).length > 0
    ? Math.round((members.filter((m) => m.chaptersRead > 0).reduce((sum, m) => sum + m.streak, 0) / members.filter((m) => m.chaptersRead > 0).length) * 10) / 10
    : 0;

  const topReaders = [...members].sort((a, b) => b.chaptersRead - a.chaptersRead).slice(0, 5).filter((m) => m.chaptersRead > 0);
  const topStreaks = [...members].sort((a, b) => b.streak - a.streak).slice(0, 5).filter((m) => m.streak > 0);

  const completionBuckets = (() => {
    const buckets = [
      { label: "0–25", count: 0, min: 0, max: 25 },
      { label: "26–50", count: 0, min: 26, max: 50 },
      { label: "51–75", count: 0, min: 51, max: 75 },
      { label: "76–100", count: 0, min: 76, max: 100 },
      { label: "100+", count: 0, min: 101, max: Infinity },
    ];
    members.forEach((m) => {
      const chapters = m.chaptersRead;
      const bucket = buckets.find((b) => chapters >= b.min && chapters <= b.max) || buckets[0];
      bucket.count += 1;
    });
    return buckets.map(({ label, count }) => ({ label, count }));
  })();

  const weeklyDeltaPct = stats.chaptersPrev7Days > 0
    ? Math.round(((stats.chaptersLast7Days - stats.chaptersPrev7Days) / stats.chaptersPrev7Days) * 100)
    : stats.chaptersLast7Days > 0 ? 100 : 0;

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
      <div className="space-y-4 sm:space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Admin Dashboard</CardTitle>
            <CardDescription>Manage your congregation's reading progress</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="members" className="flex-1 sm:flex-none text-xs sm:text-sm">Members</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                  <Card className="p-3 sm:p-6">
                    <CardHeader className="p-0 pb-1 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"><UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />Members</CardTitle></CardHeader>
                    <CardContent className="p-0 pt-1"><div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div></CardContent>
                  </Card>
                  <Card className="p-3 sm:p-6">
                    <CardHeader className="p-0 pb-1 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"><Book className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />Books</CardTitle></CardHeader>
                    <CardContent className="p-0 pt-1">
                      <div className="text-xl sm:text-2xl font-bold">{stats.uniqueBooksRead}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">unique books read</div>
                    </CardContent>
                  </Card>
                  <Card className="p-3 sm:p-6">
                    <CardHeader className="p-0 pb-1 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"><Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />Active (7d)</CardTitle></CardHeader>
                    <CardContent className="p-0 pt-1"><div className="text-xl sm:text-2xl font-bold">{active7Count}</div><div className="text-[11px] text-muted-foreground mt-0.5">{active30Count} active in 30d</div></CardContent>
                  </Card>
                  <Card className="p-3 sm:p-6">
                    <CardHeader className="p-0 pb-1 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"><AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />Inactive (14d)</CardTitle></CardHeader>
                    <CardContent className="p-0 pt-1"><div className="text-xl sm:text-2xl font-bold">{inactive14Members.length}</div><div className="text-[11px] text-muted-foreground mt-0.5">Needs follow up</div></CardContent>
                  </Card>
                  <Card className="p-3 sm:p-6">
                    <CardHeader className="p-0 pb-1 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />This week</CardTitle></CardHeader>
                    <CardContent className="p-0 pt-1">
                      <div className="text-xl sm:text-2xl font-bold">{stats.chaptersLast7Days}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{weeklyDeltaPct >= 0 ? "+" : ""}{weeklyDeltaPct}% vs last week</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="overflow-hidden">
                  <CardHeader className="px-3 sm:px-6 py-2 sm:py-3"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary shrink-0" />Top Readers</CardTitle></CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-2 sm:pb-3">
                    {topReaders.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-2">No data yet</div>
                    ) : (
                      <div className="space-y-1.5">
                        {topReaders.map((m, idx) => (
                          <div key={m.id} className="bg-muted/50 rounded-md px-3 py-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                              <span className="font-medium text-sm truncate" title={m.name}>{m.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-sm font-bold text-primary">{m.chaptersRead}</span>
                              <span className="text-xs text-muted-foreground">chapters</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="px-3 sm:px-6 py-2 sm:py-3"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary shrink-0" />Top Streaks</CardTitle></CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-2 sm:pb-3">
                    {topStreaks.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-2">No streaks yet</div>
                    ) : (
                      <div className="space-y-1.5">
                        {topStreaks.map((m, idx) => (
                          <div key={m.id} className="bg-muted/50 rounded-md px-3 py-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                              <span className="font-medium text-sm truncate" title={m.name}>{m.name}</span>
                            </div>
                            <span className="text-sm font-bold text-primary shrink-0">{m.streak}d</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="overflow-hidden">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-6"><CardTitle className="text-sm sm:text-base">Progress Over Time</CardTitle></CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsBarChart data={stats.readingProgressByDay} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip formatter={(v: any) => [`${v} chapters`, "Completed"]} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-6"><CardTitle className="text-sm sm:text-base">Most Read Books</CardTitle></CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <ResponsiveContainer width="100%" height={220}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="overflow-hidden">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-6"><CardTitle className="text-sm sm:text-base">Reading by Weekday (30d)</CardTitle></CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsBarChart data={stats.weekdayCounts} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip formatter={(v: any) => [`${v} chapters`, "Completed"]} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-6"><CardTitle className="text-sm sm:text-base">Chapters Read Distribution</CardTitle></CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsBarChart data={completionBuckets} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <RechartsTooltip formatter={(v: any) => [`${v} members`, "Count"]} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="overflow-hidden">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-6"><CardTitle className="text-sm sm:text-base">Group Averages</CardTitle></CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-md p-3">
                          <div className="text-xs text-muted-foreground mb-1">Chapters / member</div>
                          <div className="text-lg font-bold">{avgChaptersPerMember}</div>
                        </div>
                        <div className="bg-muted/50 rounded-md p-3">
                          <div className="text-xs text-muted-foreground mb-1">Avg streak</div>
                          <div className="text-lg font-bold">{avgStreak}d</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-6"><CardTitle className="text-sm sm:text-base">At Risk (14d+ inactive)</CardTitle></CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      {inactive14Members.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No inactive members</div>
                      ) : (
                        <div className="space-y-1">
                          {inactive14Members.slice(0, 8).map((m) => (
                            <div key={m.id} className="flex justify-between text-sm">
                              <button className="text-left truncate pr-2 hover:underline" onClick={() => openMemberDetail(m)}>{m.name}</button>
                              <span className="text-xs text-muted-foreground">{m.lastActive ? `${daysSince(m.lastActive)}d` : "Never"}</span>
                            </div>
                          ))}
                          {inactive14Members.length > 8 && (
                            <div className="text-xs text-muted-foreground pt-1">+{inactive14Members.length - 8} more</div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <Card className="overflow-hidden">
                  <CardHeader className="px-4 sm:px-6 py-4"><CardTitle className="text-base sm:text-lg">Members</CardTitle></CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
                    <MemberManagement />
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h3 className="text-sm sm:text-base font-medium">Member List</h3>
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                      </div>
                      <div className="rounded-md border overflow-x-auto -mx-1 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[120px]">Name</TableHead>
                              <TableHead className="hidden md:table-cell">Progress</TableHead>
                              <TableHead className="hidden md:table-cell">Streak</TableHead>
                              <TableHead className="text-right min-w-[140px] sm:min-w-[180px]">Actions</TableHead>
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
                                  <TableCell className="font-medium py-3">
                                    <span className="block truncate max-w-[140px] sm:max-w-none">{member.name}</span>
                                    {member.isAdmin && (
                                      <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary w-fit">
                                        <ShieldCheck className="h-3 w-3 mr-0.5" />Admin
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-3">
                                    <span className="text-xs text-muted-foreground">{member.chaptersRead} chapters</span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-3">{member.streak}d</TableCell>
                                  <TableCell className="text-right py-3">
                                    <div className="flex justify-end gap-1 flex-wrap">
                                      <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => openMemberDetail(member)}>View</Button>
                                      <Button variant={member.isAdmin ? "default" : "outline"} size="sm" className="h-8 text-xs sm:text-sm shrink-0" onClick={() => setMemberRoleToToggle(member)}>
                                        <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" /><span className="hidden sm:inline">{member.isAdmin ? "Admin" : "Make Admin"}</span>
                                      </Button>
                                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:px-3 text-destructive shrink-0" onClick={() => setMemberToDelete(member)} disabled={member.isAdmin}>
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
          <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px] max-h-[85vh] overflow-y-auto sm:max-h-[80vh]">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-base sm:text-lg pr-8">{selectedMember?.name}'s Progress</DialogTitle>
              <DialogDescription>Reading history for this member</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <Card className="p-3"><div className="text-xs text-muted-foreground">Chapters</div><div className="text-lg sm:text-xl font-bold">{selectedMember?.chaptersRead || 0}</div></Card>
              <Card className="p-3"><div className="text-xs text-muted-foreground">Streak</div><div className="text-lg sm:text-xl font-bold">{selectedMember?.streak || 0}d</div></Card>
              <Card className="p-3"><div className="text-xs text-muted-foreground">Last Active</div><div className="text-sm font-medium">{selectedMember?.lastActive ? new Date(selectedMember.lastActive).toLocaleDateString() : "Never"}</div></Card>
            </div>
            <div className="border rounded-md p-3 mt-2 min-w-0">
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
