import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bibleBooks, getUserReadingProgress, saveChapterCompletion, saveBookCompletion, getUserReadingStats, testamentGroups } from "@/services/bibleService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, BookCheck, Award, ChevronDown, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

const Dashboard = () => {
  const { user } = useAuth();
  const [readingProgress, setReadingProgress] = useState<Record<string, Record<number, boolean>>>({});
  const [stats, setStats] = useState({
    totalChaptersRead: 0,
    streakDays: 0,
    lastReadDate: null as string | null,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Fetch user reading progress and stats
  useEffect(() => {
    if (user) {
      fetchReadingProgress();
      fetchUserStats();
    }
  }, [user]);

  const fetchReadingProgress = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const progress = await getUserReadingProgress(user.id);
      setReadingProgress(progress);
    } catch (error) {
      console.error("Error fetching reading progress:", error);
      toast({
        title: "Error",
        description: "Failed to load your reading progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user?.id) return;
    
    try {
      const userStats = await getUserReadingStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handleCheckboxChange = async (book: string, chapter: number, checked: boolean) => {
    if (!user?.id) return;

    // Update optimistically in the UI
    setReadingProgress(prev => ({
      ...prev,
      [book]: {
        ...prev[book],
        [chapter]: checked
      }
    }));

    // Save to Supabase
    const success = await saveChapterCompletion(user.id, book, chapter, checked);
    
    if (success) {
      // Update stats after successful save
      fetchUserStats();
      
      // Show toast notification
      if (checked) {
        toast({
          title: "Chapter completed",
          description: `Great job completing ${book} ${chapter}!`,
        });
      }
    } else {
      // Revert UI if save failed
      setReadingProgress(prev => ({
        ...prev,
        [book]: {
          ...prev[book],
          [chapter]: !checked
        }
      }));
      
      toast({
        title: "Error",
        description: "Failed to save your progress",
        variant: "destructive",
      });
    }
  };

  const handleCheckAll = async (book: string, chapters: number, check: boolean) => {
    if (!user?.id) return;

    // Optimistically update UI
    setReadingProgress(prev => {
      const newBookProgress = { ...prev[book] };
      for (let i = 1; i <= chapters; i++) {
        newBookProgress[i] = check;
      }
      return {
        ...prev,
        [book]: newBookProgress
      };
    });

    const success = await saveBookCompletion(user.id, book, chapters, check);
    
    if (success) {
      fetchUserStats();
      toast({
        title: check ? "Book completed" : "Progress cleared",
        description: check ? `Great job completing ${book}!` : `Cleared progress for ${book}.`,
      });
    } else {
      // Revert UI if fail
      fetchReadingProgress();
      toast({
        title: "Error",
        description: "Failed to save your progress",
        variant: "destructive",
      });
    }
  };

  // Filter books based on search query
  const getFilteredBooks = () => {
    if (!searchQuery) return testamentGroups;
    
    const filteredOldTestament = testamentGroups["Old Testament"].filter(book => 
      book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const filteredNewTestament = testamentGroups["New Testament"].filter(book => 
      book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return {
      "Old Testament": filteredOldTestament,
      "New Testament": filteredNewTestament
    };
  };

  // Calculate total completion stats
  const calculateCompletionStats = () => {
    let completed = 0;
    let total = 0;
    
    for (const book of bibleBooks) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        total++;
        if (readingProgress[book.name]?.[chapter]) {
          completed++;
        }
      }
    }
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  const completionStats = calculateCompletionStats();

  // Generate chapter blocks for a book
  const renderChapters = (book: string, chapterCount: number) => {
    const chapters = [];
    for (let i = 1; i <= chapterCount; i++) {
      const isCompleted = readingProgress[book]?.[i] || false;
      chapters.push(
        <div key={`${book}-${i}`} className="inline-flex items-center space-x-2 m-1">
          <Checkbox
            id={`${book}-${i}`}
            checked={isCompleted}
            onCheckedChange={(checked) => handleCheckboxChange(book, i, checked === true)}
            className="data-[state=checked]:bg-primary"
          />
          <label
            htmlFor={`${book}-${i}`}
            className={`text-sm select-none cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
          >
            {i}
          </label>
        </div>
      );
    }
    return chapters;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Bible Reading Checklist</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklist">Full Checklist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium">
                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completionStats.completed}/{completionStats.total}</div>
                  <Progress value={completionStats.percentage} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">{completionStats.percentage}% complete</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium">
                    <Award className="mr-2 h-4 w-4 text-primary" />
                    Current Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.streakDays} days</div>
                  <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium">
                    <BookCheck className="mr-2 h-4 w-4 text-primary" />
                    Total Chapters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalChaptersRead}</div>
                  <p className="text-xs text-muted-foreground mt-1">Chapters read</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm font-medium">
                    <Calendar className="mr-2 h-4 w-4 text-primary" />
                    Last Reading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.lastReadDate ? format(new Date(stats.lastReadDate), "MMM d") : "Never"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.lastReadDate ? format(new Date(stats.lastReadDate), "yyyy") : "Start today!"}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Old Testament Progress</CardTitle>
                  <CardDescription>Track your progress through the Old Testament</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-8 text-center">Loading progress...</div>
                  ) : (
                    <div className="space-y-4">
                      {testamentGroups["Old Testament"].slice(0, 8).map(book => {
                        const totalChapters = book.chapters;
                        const completedChapters = Object.values(readingProgress[book.name] || {}).filter(Boolean).length;
                        const percentage = Math.round((completedChapters / totalChapters) * 100);
                        
                        return (
                          <div key={book.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{book.name}</span>
                              <span className="text-muted-foreground">{completedChapters}/{totalChapters}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setActiveTab("checklist");
                          setExpandedItems({"Old Testament": true});
                        }}
                      >
                        View All Old Testament Books
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>New Testament Progress</CardTitle>
                  <CardDescription>Track your progress through the New Testament</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-8 text-center">Loading progress...</div>
                  ) : (
                    <div className="space-y-4">
                      {testamentGroups["New Testament"].slice(0, 8).map(book => {
                        const totalChapters = book.chapters;
                        const completedChapters = Object.values(readingProgress[book.name] || {}).filter(Boolean).length;
                        const percentage = Math.round((completedChapters / totalChapters) * 100);
                        
                        return (
                          <div key={book.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{book.name}</span>
                              <span className="text-muted-foreground">{completedChapters}/{totalChapters}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setActiveTab("checklist");
                          setExpandedItems({"New Testament": true});
                        }}
                      >
                        View All New Testament Books
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Bible Reading Checklist</CardTitle>
                <CardDescription>Check off chapters as you complete your reading</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search books..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {loading ? (
                  <div className="py-12 text-center">Loading your reading progress...</div>
                ) : (
                  <ScrollArea className="h-[60vh] rounded-md">
                    <Accordion
                      type="multiple"
                      defaultValue={["Old Testament", "New Testament"]}
                      className="w-full"
                      value={Object.keys(expandedItems).filter(key => expandedItems[key])}
                      onValueChange={(value) => {
                        const newExpandedItems: Record<string, boolean> = {};
                        value.forEach(key => {
                          newExpandedItems[key] = true;
                        });
                        setExpandedItems(newExpandedItems);
                      }}
                    >
                      {Object.entries(getFilteredBooks()).map(([testament, books]) => (
                        books.length > 0 && (
                          <AccordionItem value={testament} key={testament}>
                            <AccordionTrigger className="text-lg font-medium py-4">
                              {testament} ({books.length} books)
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-1">
                                {books.map(book => {
                                  const completedChapters = Object.values(readingProgress[book.name] || {}).filter(Boolean).length;
                                  const percentage = Math.round((completedChapters / book.chapters) * 100);
                                  
                                  return (
                                    <Accordion
                                      type="multiple"
                                      key={book.name}
                                      className="border rounded-md"
                                      value={Object.keys(expandedItems).filter(key => expandedItems[key])}
                                      onValueChange={(value) => {
                                        const newExpandedItems = {...expandedItems};
                                        value.forEach(key => {
                                          newExpandedItems[key] = true;
                                        });
                                        // Find removed items
                                        Object.keys(expandedItems).forEach(key => {
                                          if (!value.includes(key)) {
                                            newExpandedItems[key] = false;
                                          }
                                        });
                                        setExpandedItems(newExpandedItems);
                                      }}
                                    >
                                      <AccordionItem value={book.name} className="border-none">
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                          <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center">
                                              <span className="font-medium">{book.name}</span>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                              <span className="text-xs text-muted-foreground">
                                                {completedChapters}/{book.chapters} ({percentage}%)
                                              </span>
                                              <Progress value={percentage} className="w-24 h-2" />
                                            </div>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="p-4 bg-muted/20 rounded-md">
                                            <div className="flex justify-between items-center mb-4">
                                              <span className="text-sm font-medium">Chapters</span>
                                              <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleCheckAll(book.name, book.chapters, completedChapters < book.chapters)}
                                                className="h-8 text-xs"
                                              >
                                                {completedChapters < book.chapters ? "Check All" : "Uncheck All"}
                                              </Button>
                                            </div>
                                            <div className="flex flex-wrap">
                                              {renderChapters(book.name, book.chapters)}
                                            </div>
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      ))}
                    </Accordion>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
