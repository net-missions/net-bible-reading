import { supabase } from "@/integrations/supabase/client";

export const bibleBooks = [
  { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 }, { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 }, { name: "Deuteronomy", chapters: 34 }, { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 }, { name: "Ruth", chapters: 4 }, { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 }, { name: "1 Kings", chapters: 22 }, { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 }, { name: "2 Chronicles", chapters: 36 }, { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 }, { name: "Esther", chapters: 10 }, { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 }, { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 }, { name: "Isaiah", chapters: 66 }, { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 }, { name: "Ezekiel", chapters: 48 }, { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 }, { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 }, { name: "Jonah", chapters: 4 }, { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 }, { name: "Habakkuk", chapters: 3 }, { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 }, { name: "Zechariah", chapters: 14 }, { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 }, { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 }, { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 }, { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 }, { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 }, { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 }, { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 },
];

export const testamentGroups = {
  "Old Testament": bibleBooks.slice(0, 39),
  "New Testament": bibleBooks.slice(39),
};

export const READING_START_DATE = new Date(2026, 1, 16); // Feb 16, 2026
export const CHAPTERS_PER_DAY = 4;

export type ReadingProgress = {
  id: string; user_id: string; book: string; chapter: number;
  completed: boolean; completed_at: string | null; created_at: string;
};

export const getUserReadingProgress = async (userId: string): Promise<Record<string, Record<number, boolean>>> => {
  try {
    const { data, error } = await supabase.from("reading_progress" as any).select("*").eq("user_id", userId).eq("completed", true);
    if (error) throw error;

    const result: Record<string, Record<number, boolean>> = {};
    for (const book of bibleBooks) {
      result[book.name] = {};
      for (let i = 1; i <= book.chapters; i++) result[book.name][i] = false;
    }
    if (data) {
      for (const p of data as any[]) {
        if (result[p.book] && p.chapter) result[p.book][p.chapter] = true;
      }
    }
    return result;
  } catch (error) {
    console.error("Error:", error);
    return {};
  }
};

export const saveBookCompletion = async (userId: string, book: string, chapters: number, isCompleted: boolean): Promise<boolean> => {
  try {
    const { data: existingRecords } = await supabase
      .from("reading_progress" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("book", book);

    const now = new Date().toISOString();
    const existingMap = new Map();
    if (existingRecords) {
      existingRecords.forEach((r: any) => existingMap.set(r.chapter, r));
    }

    const insertData = [];
    const updatePromises = [];

    for (let c = 1; c <= chapters; c++) {
      if (existingMap.has(c)) {
        updatePromises.push(
          supabase
            .from("reading_progress" as any)
            .update({
              completed: isCompleted,
              completed_at: isCompleted ? now : null
            } as any)
            .eq("id", existingMap.get(c).id)
        );
      } else {
        insertData.push({
          user_id: userId,
          book,
          chapter: c,
          completed: isCompleted,
          completed_at: isCompleted ? now : null
        });
      }
    }

    if (insertData.length > 0) {
      const { error } = await supabase.from("reading_progress" as any).insert(insertData as any);
      if (error) throw error;
    }

    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      for (const res of results) {
        if (res.error) throw res.error;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error bulk saving:", error);
    return false;
  }
};

export const saveAdvancedSync = async (userId: string, targetBookName: string, targetChapter: number): Promise<boolean> => {
  try {
    const { data: existingRecords } = await supabase
      .from("reading_progress" as any)
      .select("*")
      .eq("user_id", userId);

    const now = new Date().toISOString();
    const existingMap = new Map();
    if (existingRecords) {
      existingRecords.forEach((r: any) => existingMap.set(`${r.book}-${r.chapter}`, r));
    }

    const insertData = [];
    const updatePromises = [];

    let hasPassedTarget = false;

    for (const book of bibleBooks) {
      for (let c = 1; c <= book.chapters; c++) {
        const isTarget = book.name === targetBookName && c === targetChapter;
        const markAsRead = !hasPassedTarget;
        
        if (isTarget) {
          hasPassedTarget = true;
        }

        const key = `${book.name}-${c}`;
        const existing = existingMap.get(key);

        if (existing) {
          // Only update if the status is changing
          if (existing.completed !== markAsRead) {
            updatePromises.push(
              supabase
                .from("reading_progress" as any)
                .update({
                  completed: markAsRead,
                  completed_at: markAsRead ? now : null
                } as any)
                .eq("id", existing.id)
            );
          }
        } else if (markAsRead) {
          // Only insert if it needs to be marked as read (saves DB space)
          insertData.push({
            user_id: userId,
            book: book.name,
            chapter: c,
            completed: true,
            completed_at: now
          });
        }
      }
    }

    // Process inserts in batches to avoid payload too large errors
    const BATCH_SIZE = 100;
    for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
      const batch = insertData.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("reading_progress" as any).insert(batch as any);
      if (error) throw error;
    }

    // Process updates in chunks
    const UPDATE_BATCH_SIZE = 20;
    for (let i = 0; i < updatePromises.length; i += UPDATE_BATCH_SIZE) {
      const batch = updatePromises.slice(i, i + UPDATE_BATCH_SIZE);
      const results = await Promise.all(batch);
      for (const res of results) {
        if (res.error) throw res.error;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error advanced syncing:", error);
    return false;
  }
};

export const saveChapterCompletion = async (userId: string, book: string, chapter: number, isCompleted: boolean): Promise<boolean> => {
  try {
    const { data: existing } = await supabase.from("reading_progress" as any).select("*").eq("user_id", userId).eq("book", book).eq("chapter", chapter).maybeSingle();
    const now = new Date().toISOString();

    if (existing) {
      await supabase.from("reading_progress" as any).update({ completed: isCompleted, completed_at: isCompleted ? now : null } as any).eq("id", (existing as any).id);
    } else {
      await supabase.from("reading_progress" as any).insert({ user_id: userId, book, chapter, completed: isCompleted, completed_at: isCompleted ? now : null } as any);
    }
    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};

export const getUserReadingStats = async (userId: string) => {
  try {
    const { data } = await supabase.from("reading_progress" as any).select("*").eq("user_id", userId).eq("completed", true).order("completed_at", { ascending: false });
    const totalChaptersRead = data?.length || 0;
    let lastReadDate: string | null = null;
    let streakDays = 0;

    if (data && (data as any[]).length > 0) {
      lastReadDate = (data as any[])[0].completed_at;
      const dates = [...new Set((data as any[]).map((i: any) => i.completed_at?.split("T")[0]).filter(Boolean) as string[])].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      if (dates.length > 0) {
        streakDays = 1;
        for (let i = 1; i < dates.length; i++) {
          const diff = Math.round((new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) streakDays++;
          else break;
        }
      }
    }

    const totalBibleChapters = bibleBooks.reduce((sum, b) => sum + b.chapters, 0);
    const completionRate = totalBibleChapters > 0 ? Math.round((totalChaptersRead / totalBibleChapters) * 100) : 0;

    // Calculate schedule status
    const daysSinceStart = Math.max(0, Math.floor((new Date().getTime() - READING_START_DATE.getTime()) / (1000 * 60 * 60 * 24)));
    const expectedChapters = (daysSinceStart + 1) * CHAPTERS_PER_DAY;
    const scheduleStatus = totalChaptersRead - expectedChapters;

    return { totalChaptersRead, streakDays, lastReadDate, completionRate, scheduleStatus };
  } catch {
    return { totalChaptersRead: 0, streakDays: 0, lastReadDate: null, completionRate: 0, scheduleStatus: 0 };
  }
};

export const getMonthReadings = (userId: string, year: number, month: number): Record<string, number> => {
  const result: Record<string, number> = {};
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    result[`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`] = 0;
  }

  (async () => {
    try {
      const startStr = new Date(year, month, 1).toISOString();
      const endStr = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { data } = await supabase.from("reading_progress" as any).select("*").eq("user_id", userId).eq("completed", true).gte("completed_at", startStr).lte("completed_at", endStr);
      if (data) {
        (data as any[]).forEach((item: any) => {
          if (item.completed_at) {
            const d = new Date(item.completed_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            result[key] = (result[key] || 0) + 1;
          }
        });
      }
    } catch {}
  })();

  return result;
};
