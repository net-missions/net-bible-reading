import { supabase } from "@/integrations/supabase/client";

// Bible books with their chapter counts
export const bibleBooks = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 }
];

// Group books by testament
export const testamentGroups = {
  "Old Testament": bibleBooks.slice(0, 39),
  "New Testament": bibleBooks.slice(39)
};

// Types
export type BibleChapter = {
  id: string;
  book: string;
  chapter: number;
  isCompleted: boolean;
  completed_at?: string | null;
};

export type ReadingProgress = {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type UserReading = {
  userId: string;
  date: string;
  chapters: BibleChapter[];
};

// Get all books and their completion status for a user
export const getUserReadingProgress = async (userId: string): Promise<Record<string, Record<number, boolean>>> => {
  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true);
    
    if (error) throw error;
    
    // Create a map of book -> chapter -> completion status
    const result: Record<string, Record<number, boolean>> = {};
    
    // Initialize all books and chapters as not completed
    for (const book of bibleBooks) {
      result[book.name] = {};
      for (let i = 1; i <= book.chapters; i++) {
        result[book.name][i] = false;
      }
    }
    
    // Mark the completed chapters
    if (data) {
      for (const progress of data) {
        if (result[progress.book] && progress.chapter) {
          result[progress.book][progress.chapter] = true;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return {};
  }
};

// Get reading progress for a specific book
export const getBookProgress = async (userId: string, bookName: string): Promise<Record<number, boolean>> => {
  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book', bookName)
      .eq('completed', true);
    
    if (error) throw error;
    
    // Find the book in the Bible books array to get the number of chapters
    const book = bibleBooks.find(b => b.name === bookName);
    if (!book) return {};
    
    // Initialize all chapters as not completed
    const result: Record<number, boolean> = {};
    for (let i = 1; i <= book.chapters; i++) {
      result[i] = false;
    }
    
    // Mark the completed chapters
    if (data) {
      for (const progress of data) {
        if (progress.chapter) {
          result[progress.chapter] = true;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching book progress:', error);
    return {};
  }
};

// Save or update the completion status of a chapter
export const saveChapterCompletion = async (
  userId: string, 
  book: string, 
  chapter: number, 
  isCompleted: boolean
): Promise<boolean> => {
  try {
    // Check if progress entry already exists
    const { data: existingData, error: fetchError } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book', book)
      .eq('chapter', chapter)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    const now = new Date().toISOString();
    
    if (existingData) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('reading_progress')
        .update({
          completed: isCompleted,
          completed_at: isCompleted ? now : null
        })
        .eq('id', existingData.id);
        
      if (updateError) throw updateError;
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('reading_progress')
        .insert({
          user_id: userId,
          book,
          chapter,
          completed: isCompleted,
          completed_at: isCompleted ? now : null
        });
        
      if (insertError) throw insertError;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving chapter completion:', error);
    return false;
  }
};

// Get reading stats for a user
export const getUserReadingStats = async (userId: string): Promise<{
  totalChaptersRead: number;
  streakDays: number;
  lastReadDate: string | null;
  completionRate: number;
}> => {
  try {
    // Get all completed readings
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('completed_at', { ascending: false });
    
    if (error) throw error;
    
    const totalChaptersRead = data?.length || 0;
    let lastReadDate: string | null = null;
    let streakDays = 0;
    
    if (data && data.length > 0) {
      // Set last read date from the most recent completion
      lastReadDate = data[0].completed_at;
      
      // Calculate streak by checking consecutive days
      const completedDates = new Set<string>();
      data.forEach(item => {
        if (item.completed_at) {
          completedDates.add(item.completed_at.split('T')[0]);
        }
      });
      
      // Convert to array and sort in descending order
      const sortedDates = Array.from(completedDates).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      
      // Calculate streak
      if (sortedDates.length > 0) {
        streakDays = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(sortedDates[i-1]);
          const currDate = new Date(sortedDates[i]);
          
          // Check if dates are consecutive
          const diffTime = prevDate.getTime() - currDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streakDays++;
          } else {
            break;
          }
        }
      }
    }
    
    // Calculate completion rate (out of total Bible chapters)
    const totalBibleChapters = bibleBooks.reduce((sum, book) => sum + book.chapters, 0);
    const completionRate = totalBibleChapters > 0 ? 
      Math.round((totalChaptersRead / totalBibleChapters) * 100) : 0;
    
    return {
      totalChaptersRead,
      streakDays,
      lastReadDate,
      completionRate
    };
  } catch (error) {
    console.error('Error fetching user reading stats:', error);
    return {
      totalChaptersRead: 0,
      streakDays: 0,
      lastReadDate: null,
      completionRate: 0
    };
  }
};

// Get reading statistics for a specific month
export const getMonthReadings = (userId: string, year: number, month: number): Record<string, number> => {
  // Initialize empty result object
  const result: Record<string, number> = {};
  
  // Create a new date at the start of the specified month
  const startDate = new Date(year, month, 1);
  
  // Get the last day of the month
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  // Pre-populate with zeros for all days in the month
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    result[dateStr] = 0;
  }
  
  // Fetch data from Supabase asynchronously and update the result
  const fetchData = async () => {
    try {
      // Format dates for Supabase query
      const startStr = startDate.toISOString();
      const endStr = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', startStr)
        .lte('completed_at', endStr);
      
      if (error) {
        console.error('Error fetching month readings:', error);
        return;
      }
      
      // Group readings by day and count
      if (data && data.length > 0) {
        data.forEach(item => {
          if (item.completed_at) {
            const date = new Date(item.completed_at);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            result[dateStr] = (result[dateStr] || 0) + 1;
          }
        });
      }
    } catch (error) {
      console.error('Error in getMonthReadings:', error);
    }
  };
  
  // Start the fetch but don't wait for it
  fetchData();
  
  // Return the pre-populated result immediately
  // The UI will update when the fetch completes
  return result;
};

// Get congregation statistics for admin dashboard
export const getCongregationStats = async (): Promise<{
  totalUsers: number;
  totalChaptersRead: number;
  averageCompletion: number;
  topBooks: { book: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}> => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) throw usersError;
    
    // Get all completed readings
    const { data: progressData, error: progressError } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('completed', true)
      .order('completed_at', { ascending: false });
    
    if (progressError) throw progressError;
    
    const totalChaptersRead = progressData?.length || 0;
    
    // Calculate top books
    const bookCounts: Record<string, number> = {};
    progressData?.forEach(item => {
      if (item.book) {
        bookCounts[item.book] = (bookCounts[item.book] || 0) + 1;
      }
    });
    
    const topBooks = Object.entries(bookCounts)
      .map(([book, count]) => ({ book, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Calculate recent activity by day
    const recentActivity: { date: string; count: number }[] = [];
    const dateActivityMap: Record<string, number> = {};
    
    progressData?.forEach(item => {
      if (item.completed_at) {
        const date = item.completed_at.split('T')[0];
        dateActivityMap[date] = (dateActivityMap[date] || 0) + 1;
      }
    });
    
    // Get the last 30 days with activity
    const sortedDates = Object.keys(dateActivityMap)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 30);
    
    sortedDates.forEach(date => {
      recentActivity.push({
        date,
        count: dateActivityMap[date]
      });
    });
    
    // Calculate average completion rate across all users
    const totalBibleChapters = bibleBooks.reduce((sum, book) => sum + book.chapters, 0);
    const usersWithReadings = new Set(progressData?.map(item => item.user_id)).size;
    const averageCompletion = (usersWithReadings && totalBibleChapters) ?
      Math.round((totalChaptersRead / (usersWithReadings * totalBibleChapters)) * 100) : 0;
    
    return {
      totalUsers: totalUsers || 0,
      totalChaptersRead,
      averageCompletion,
      topBooks,
      recentActivity: recentActivity.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  } catch (error) {
    console.error('Error fetching congregation stats:', error);
    return {
      totalUsers: 0,
      totalChaptersRead: 0,
      averageCompletion: 0,
      topBooks: [],
      recentActivity: []
    };
  }
};

// Helper function to convert a string to a deterministic number (for consistent pseudo-random values)
function stringToNumber(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
}
