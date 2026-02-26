// Bible API Service — uses YouVersion Platform REST API
// https://developers.youversion.com

import { bibleBooks } from "@/services/bibleService";

// ─── Types ───────────────────────────────────────────────
export type BibleVerse = {
  verse: number;
  text: string;
};

export type BibleChapterResponse = {
  reference: string;
  verses: BibleVerse[];
  htmlContent: string; // raw HTML from YouVersion
  copyright: string | null;
  translation_id: string;
  translation_name: string;
};

/** Each translation the user can pick */
export type TranslationInfo = {
  id: string;       // internal key
  versionId: number; // YouVersion bible_id
  label: string;     // full name
  short: string;     // abbreviation shown in UI
};

export type BibleTranslation = string; // translation id key

// ─── Available translations ───────────────────────────────
// These are the English versions available on your YouVersion account.
// Available versions on this account (tested & confirmed accessible)
const TRANSLATIONS: TranslationInfo[] = [
  { id: "niv",    versionId: 111,  label: "New International Version",       short: "NIV" },
  { id: "nasb",   versionId: 2692, label: "New American Standard Bible",     short: "NASB" },
  { id: "nirv",   versionId: 110,  label: "New International Reader's Ver.", short: "NIrV" },
  { id: "bsb",    versionId: 3034, label: "Berean Standard Bible",           short: "BSB" },
  { id: "asv",    versionId: 12,   label: "American Standard Version",       short: "ASV" },
  { id: "web",    versionId: 206,  label: "World English Bible",             short: "WEB" },
];

export const getAllTranslations = () => TRANSLATIONS;

export const getTranslationLabel = (t: BibleTranslation) =>
  TRANSLATIONS.find((tr) => tr.id === t)?.label ?? t.toUpperCase();

export const getTranslationShort = (t: BibleTranslation) =>
  TRANSLATIONS.find((tr) => tr.id === t)?.short ?? t.toUpperCase();

export const getVersionId = (t: BibleTranslation): number =>
  TRANSLATIONS.find((tr) => tr.id === t)?.versionId ?? 3034;

// ─── USFM book code mapping ──────────────────────────────
const USFM_CODES: Record<string, string> = {
  "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV",
  "Numbers": "NUM", "Deuteronomy": "DEU", "Joshua": "JOS",
  "Judges": "JDG", "Ruth": "RUT", "1 Samuel": "1SA",
  "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH",
  "Ezra": "EZR", "Nehemiah": "NEH", "Esther": "EST",
  "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
  "Ecclesiastes": "ECC", "Song of Solomon": "SNG",
  "Isaiah": "ISA", "Jeremiah": "JER", "Lamentations": "LAM",
  "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS",
  "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA",
  "Jonah": "JON", "Micah": "MIC", "Nahum": "NAM",
  "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG",
  "Zechariah": "ZEC", "Malachi": "MAL",
  "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK",
  "John": "JHN", "Acts": "ACT", "Romans": "ROM",
  "1 Corinthians": "1CO", "2 Corinthians": "2CO",
  "Galatians": "GAL", "Ephesians": "EPH",
  "Philippians": "PHP", "Colossians": "COL",
  "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
  "1 Timothy": "1TI", "2 Timothy": "2TI",
  "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
  "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE",
  "1 John": "1JN", "2 John": "2JN", "3 John": "3JN",
  "Jude": "JUD", "Revelation": "REV",
};

// ─── API config ──────────────────────────────────────────
const API_BASE = "https://api.youversion.com/v1";
const APP_KEY = import.meta.env.VITE_YVP_APP_KEY || "";

const headers = () => ({
  "X-YVP-App-Key": APP_KEY,
});

// ─── Cache ───────────────────────────────────────────────
const cache = new Map<string, BibleChapterResponse>();
function cacheKey(book: string, chapter: number, translation: BibleTranslation) {
  return `${translation}:${book}:${chapter}`;
}

// ─── Parse HTML into verse objects ───────────────────────
function parseVersesFromHtml(html: string): BibleVerse[] {
  const verses: BibleVerse[] = [];
  // Match each verse marker and capture text until the next one
  // Pattern: <span class="yv-v" v="N"></span><span class="yv-vlbl">N</span>VERSE_TEXT
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove heading elements
  doc.querySelectorAll(".yv-h, .s1, .s2, .s3, .r, .d").forEach((el) => el.remove());

  const markerEls = doc.querySelectorAll("span.yv-v");
  markerEls.forEach((marker) => {
    const verseNum = parseInt(marker.getAttribute("v") || "0", 10);
    if (!verseNum) return;

    // Collect text from after this marker until the next yv-v marker
    let text = "";
    let node: Node | null = marker.nextSibling;

    // Skip the label span
    if (node && (node as Element).classList?.contains("yv-vlbl")) {
      node = node.nextSibling;
    }

    while (node) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).classList?.contains("yv-v")
      ) {
        break;
      }
      // If this node contains a yv-v descendant, extract text before it
      if (node.nodeType === Node.ELEMENT_NODE) {
        const inner = (node as Element).querySelector?.("span.yv-v");
        if (inner) {
          // Walk children of this node up to the inner marker
          break;
        }
      }
      text += node.textContent || "";
      node = node.nextSibling;
    }

    text = text.trim();
    if (text) {
      verses.push({ verse: verseNum, text });
    }
  });

  // If parsing fails, fall back to simple text extraction
  if (verses.length === 0) {
    const fullText = doc.body?.textContent?.trim() || "";
    if (fullText) {
      verses.push({ verse: 1, text: fullText });
    }
  }

  return verses;
}

// ─── Fetch copyright for a version ──────────────────────
const copyrightCache = new Map<number, string | null>();

async function fetchCopyright(versionId: number): Promise<string | null> {
  if (copyrightCache.has(versionId)) return copyrightCache.get(versionId)!;
  try {
    const res = await fetch(`${API_BASE}/bibles/${versionId}`, { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      const cr = data.copyright || null;
      copyrightCache.set(versionId, cr);
      return cr;
    }
  } catch {
    // ignore
  }
  copyrightCache.set(versionId, null);
  return null;
}

// ─── Main fetch function ────────────────────────────────
export const fetchChapter = async (
  book: string,
  chapter: number,
  translation: BibleTranslation = "bsb"
): Promise<BibleChapterResponse> => {
  const key = cacheKey(book, chapter, translation);
  if (cache.has(key)) return cache.get(key)!;

  const usfm = USFM_CODES[book];
  if (!usfm) throw new Error(`Unknown book: ${book}`);

  const versionId = getVersionId(translation);
  const passageId = `${usfm}.${chapter}`;
  const url = `${API_BASE}/bibles/${versionId}/passages/${passageId}?format=html`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${book} ${chapter} (${res.status})`);
  }

  const data = await res.json();
  const htmlContent: string = data.content || "";
  const verses = parseVersesFromHtml(htmlContent);

  // Fetch copyright in parallel (non-blocking)
  const copyright = await fetchCopyright(versionId);

  const result: BibleChapterResponse = {
    reference: data.reference || `${book} ${chapter}`,
    verses,
    htmlContent,
    copyright,
    translation_id: translation,
    translation_name: getTranslationLabel(translation),
  };

  cache.set(key, result);
  return result;
};
