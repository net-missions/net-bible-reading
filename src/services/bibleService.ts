
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

// Types
export type BibleChapter = {
  id: string;
  book: string;
  chapter: number;
  isCompleted: boolean;
};

export type ReadingPlan = {
  id: string;
  name: string;
  description?: string;
  chaptersPerDay: number;
  startDate: string;
  endDate?: string;
};

export type UserReading = {
  userId: string;
  date: string;
  chapters: BibleChapter[];
};

// Get a list of chapters for a specific date
// For this demo, we'll create a simple algorithm that cycles through the Bible
// In a real app, this would come from the database based on the user's reading plan
export const getTodayReadings = (userId: string, date: string): UserReading => {
  // Create a deterministic but "random" seed based on date and user
  const seed = stringToNumber(`${userId}-${date}`);
  
  // Get a starting point in the Bible based on the seed
  let totalChapters = bibleBooks.reduce((sum, book) => sum + book.chapters, 0);
  let startingPoint = seed % totalChapters;
  
  // Find the 3 chapters starting from this point
  const chapters: BibleChapter[] = [];
  let bookIndex = 0;
  let chapterSum = 0;
  
  // Find the starting book and chapter
  while (bookIndex < bibleBooks.length && chapterSum + bibleBooks[bookIndex].chapters <= startingPoint) {
    chapterSum += bibleBooks[bookIndex].chapters;
    bookIndex++;
  }
  
  let chapterIndex = startingPoint - chapterSum + 1;
  
  // Generate 3 chapters
  for (let i = 0; i < 3; i++) {
    if (bookIndex >= bibleBooks.length) {
      bookIndex = 0; // Wrap around to Genesis
      chapterIndex = 1;
    }
    
    if (chapterIndex > bibleBooks[bookIndex].chapters) {
      bookIndex++;
      chapterIndex = 1;
      if (bookIndex >= bibleBooks.length) {
        bookIndex = 0; // Wrap around to Genesis
      }
    }
    
    chapters.push({
      id: `${bibleBooks[bookIndex].name}-${chapterIndex}-${date}`,
      book: bibleBooks[bookIndex].name,
      chapter: chapterIndex,
      isCompleted: false
    });
    
    chapterIndex++;
  }
  
  // Check localStorage for completed chapters
  const completedKey = `completed-${userId}-${date}`;
  const savedCompleted = localStorage.getItem(completedKey);
  if (savedCompleted) {
    const completedIds = JSON.parse(savedCompleted) as string[];
    chapters.forEach(chapter => {
      if (completedIds.includes(chapter.id)) {
        chapter.isCompleted = true;
      }
    });
  }
  
  return {
    userId,
    date,
    chapters
  };
};

// Save the completion status of a chapter
export const saveChapterCompletion = (userId: string, date: string, chapterId: string, isCompleted: boolean): void => {
  const completedKey = `completed-${userId}-${date}`;
  const savedCompleted = localStorage.getItem(completedKey);
  let completedIds: string[] = savedCompleted ? JSON.parse(savedCompleted) : [];
  
  if (isCompleted && !completedIds.includes(chapterId)) {
    completedIds.push(chapterId);
  } else if (!isCompleted) {
    completedIds = completedIds.filter(id => id !== chapterId);
  }
  
  localStorage.setItem(completedKey, JSON.stringify(completedIds));
};

// Get reading stats for a user
export const getUserReadingStats = (userId: string): {
  totalChaptersRead: number;
  streakDays: number;
  lastReadDate: string | null;
  completionRate: number;
} => {
  const today = new Date();
  let totalChaptersRead = 0;
  let streakDays = 0;
  let lastReadDate: string | null = null;
  let daysWithReadings = 0;
  
  // Scan the last 365 days
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const completedKey = `completed-${userId}-${dateStr}`;
    const savedCompleted = localStorage.getItem(completedKey);
    
    if (savedCompleted) {
      const completedIds = JSON.parse(savedCompleted) as string[];
      totalChaptersRead += completedIds.length;
      daysWithReadings++;
      
      // Update last read date if this is the most recent
      if (lastReadDate === null) {
        lastReadDate = dateStr;
      }
      
      // Check if this contributes to the streak (only count consecutive days)
      if (i === streakDays) {
        streakDays++;
      }
    } else if (i < streakDays) {
      // Break the streak
      break;
    }
  }
  
  // Calculate completion rate (out of 3 chapters per day)
  const totalPossibleChapters = daysWithReadings * 3;
  const completionRate = totalPossibleChapters > 0 ? 
    Math.round((totalChaptersRead / totalPossibleChapters) * 100) : 0;
  
  return {
    totalChaptersRead,
    streakDays,
    lastReadDate,
    completionRate
  };
};

// Get all reading data for a specific month (for the calendar view)
export const getMonthReadings = (userId: string, year: number, month: number): Record<string, number> => {
  const result: Record<string, number> = {};
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Check each day in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    const completedKey = `completed-${userId}-${dateStr}`;
    const savedCompleted = localStorage.getItem(completedKey);
    
    if (savedCompleted) {
      const completedIds = JSON.parse(savedCompleted) as string[];
      result[dateStr] = completedIds.length;
    } else {
      result[dateStr] = 0;
    }
  }
  
  return result;
};

// Get congregation-wide reading statistics (for admin)
export const getCongregationStats = (): {
  totalUsers: number;
  totalChaptersRead: number;
  averageCompletion: number;
  topBooks: { book: string; count: number }[];
} => {
  // In a real app, this would come from the database
  // For this demo, we'll generate some mock stats
  return {
    totalUsers: 24,
    totalChaptersRead: 1842,
    averageCompletion: 76,
    topBooks: [
      { book: "Psalms", count: 184 },
      { book: "Matthew", count: 112 },
      { book: "John", count: 92 },
      { book: "Genesis", count: 87 },
      { book: "Romans", count: 64 }
    ]
  };
};

// Simple hash function to generate a number from a string
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
