import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { bibleBooks, testamentGroups } from "@/services/bibleService";
import {
  fetchChapter,
  BibleVerse,
  BibleTranslation,
  getAllTranslations,
} from "@/services/bibleApiService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BibleReader: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialBook = searchParams.get("book") || "Genesis";
  const initialChapter = parseInt(searchParams.get("chapter") || "1", 10);

  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [selectedChapter, setSelectedChapter] = useState(initialChapter);
  const [translation, setTranslation] = useState<BibleTranslation>("niv");
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [copyright, setCopyright] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showTranslationDropdown, setShowTranslationDropdown] = useState(false);
  const [showChapterGrid, setShowChapterGrid] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");

  // Swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);

  const readingAreaRef = useRef<HTMLDivElement>(null);
  const bookDropdownRef = useRef<HTMLDivElement>(null);
  const translationDropdownRef = useRef<HTMLDivElement>(null);
  const chapterGridRef = useRef<HTMLDivElement>(null);

  const currentBookData = useMemo(
    () => bibleBooks.find((b) => b.name === selectedBook),
    [selectedBook]
  );
  const totalChapters = currentBookData?.chapters ?? 1;

  const allChapters = useMemo(() => {
    const list: { book: string; chapter: number }[] = [];
    for (const b of bibleBooks) {
      for (let c = 1; c <= b.chapters; c++) {
        list.push({ book: b.name, chapter: c });
      }
    }
    return list;
  }, []);

  const currentIndex = useMemo(
    () =>
      allChapters.findIndex(
        (c) => c.book === selectedBook && c.chapter === selectedChapter
      ),
    [allChapters, selectedBook, selectedChapter]
  );

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allChapters.length - 1;

  const loadChapter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChapter(selectedBook, selectedChapter, translation);
      setVerses(data.verses);
      setCopyright(data.copyright);
    } catch (err: any) {
      console.error("Failed to load chapter:", err);
      setError(err.message || "Failed to load chapter");
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBook, selectedChapter, translation]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    const handler = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(e.target as Node))
        setShowBookDropdown(false);
      if (translationDropdownRef.current && !translationDropdownRef.current.contains(e.target as Node))
        setShowTranslationDropdown(false);
      if (chapterGridRef.current && !chapterGridRef.current.contains(e.target as Node))
        setShowChapterGrid(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard arrows ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) goPrev();
      if (e.key === "ArrowRight" && hasNext) goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrev, hasNext, currentIndex]);

  // ── Swipe handlers ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 20 && Math.abs(dy) < Math.abs(dx) * 0.5) {
      isSwiping.current = true;
      touchDeltaX.current = dx;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping.current && Math.abs(touchDeltaX.current) > 60) {
      if (touchDeltaX.current < 0 && hasNext) goNext();
      else if (touchDeltaX.current > 0 && hasPrev) goPrev();
    }
    isSwiping.current = false;
    touchDeltaX.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNext, hasPrev, currentIndex]);

  const goToChapter = (book: string, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setShowBookDropdown(false);
    setShowChapterGrid(false);
    
    // Update URL params
    setSearchParams({ book, chapter: chapter.toString() });
  };

  const goPrev = () => {
    if (!hasPrev) return;
    const prev = allChapters[currentIndex - 1];
    goToChapter(prev.book, prev.chapter);
  };

  const goNext = () => {
    if (!hasNext) return;
    const next = allChapters[currentIndex + 1];
    goToChapter(next.book, next.chapter);
  };

  const filteredTestaments = useMemo(() => {
    if (!bookSearchQuery) return testamentGroups;
    const q = bookSearchQuery.toLowerCase();
    return {
      "Old Testament": testamentGroups["Old Testament"].filter((b) =>
        b.name.toLowerCase().includes(q)
      ),
      "New Testament": testamentGroups["New Testament"].filter((b) =>
        b.name.toLowerCase().includes(q)
      ),
    };
  }, [bookSearchQuery]);

  const fontSizeClass = {
    sm: "text-[15px] leading-[1.9]",
    md: "text-[17px] leading-[2]",
    lg: "text-[20px] leading-[2.1]",
  }[fontSize];

  const cycleFontSize = () =>
    setFontSize((p) => (p === "sm" ? "md" : p === "md" ? "lg" : "sm"));

  const prevChapter = hasPrev ? allChapters[currentIndex - 1] : null;
  const nextChapter = hasNext ? allChapters[currentIndex + 1] : null;

  return (
    <AppLayout>
      <div className="flex flex-col max-w-3xl mx-auto pb-32 min-h-full relative w-full">

        {/* ═══ Top Bar ═══ */}
        <div className="sticky top-[-1rem] sm:top-[-1.25rem] lg:top-[-1.5rem] mt-[-1rem] sm:mt-[-1.25rem] lg:mt-[-1.5rem] pt-3 sm:pt-4 lg:pt-6 z-40 bg-background/95 backdrop-blur-xl pb-3 border-b border-stone-200/60 mb-2 sm:mb-6 flex items-center gap-1 sm:gap-2 shrink-0 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:border-t-0">

          {/* Book Picker */}
          <div className="relative" ref={bookDropdownRef}>
            <button
              onClick={() => {
                setShowBookDropdown(!showBookDropdown);
                setShowTranslationDropdown(false);
                setShowChapterGrid(false);
              }}
              className="flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded-lg hover:bg-stone-50 transition-colors text-sm font-semibold text-stone-800"
            >
              <span className="truncate max-w-[110px] sm:max-w-[180px]">
                {selectedBook} {selectedChapter}
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-stone-400 transition-transform shrink-0", showBookDropdown && "rotate-180")} />
            </button>

            {showBookDropdown && (
              <div className="absolute left-0 top-11 z-50 w-72 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-stone-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      placeholder="Search books..."
                      className="pl-9 h-9 text-sm rounded-lg"
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <ScrollArea className="h-[55vh]">
                  <div className="p-2">
                    {Object.entries(filteredTestaments).map(
                      ([testament, books]) =>
                        books.length > 0 && (
                          <div key={testament} className="mb-2">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                              {testament}
                            </p>
                            {books.map((b) => (
                              <button
                                key={b.name}
                                onClick={() => goToChapter(b.name, 1)}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                  b.name === selectedBook
                                    ? "bg-bible-red/10 text-bible-red font-semibold"
                                    : "text-stone-700 hover:bg-stone-50"
                                )}
                              >
                                <span>{b.name}</span>
                                <span className="text-[11px] text-stone-400">{b.chapters} ch</span>
                              </button>
                            ))}
                          </div>
                        )
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Translation Picker */}
          <div className="relative" ref={translationDropdownRef}>
            <button
              onClick={() => {
                setShowTranslationDropdown(!showTranslationDropdown);
                setShowBookDropdown(false);
                setShowChapterGrid(false);
              }}
              className="flex items-center gap-1 h-9 px-2.5 rounded-lg hover:bg-stone-50 transition-colors text-sm font-semibold text-stone-800 uppercase"
            >
              {getAllTranslations().find((t) => t.id === translation)?.short ?? translation}
              <ChevronDown className={cn("h-3.5 w-3.5 text-stone-400 transition-transform shrink-0", showTranslationDropdown && "rotate-180")} />
            </button>

            {showTranslationDropdown && (
              <div className="absolute left-0 top-11 z-50 w-64 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-1.5">
                {getAllTranslations().map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTranslation(t.id);
                      setShowTranslationDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                      translation === t.id
                        ? "bg-bible-red/10 text-bible-red font-semibold"
                        : "text-stone-700 hover:bg-stone-50"
                    )}
                  >
                    <span className="font-bold">{t.short}</span>
                    <span className="text-[11px] text-stone-400 truncate ml-2">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Chapter Grid */}
          <div className="relative" ref={chapterGridRef}>
            <button
              onClick={() => {
                setShowChapterGrid(!showChapterGrid);
                setShowBookDropdown(false);
                setShowTranslationDropdown(false);
              }}
              className="h-9 w-9 rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-center"
              title="Go to chapter"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="text-stone-500">
                <rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="7" y="1" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="13" y="1" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="1" y="7" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="13" y="7" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="1" y="13" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor"/>
                <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor"/>
              </svg>
            </button>

            {showChapterGrid && (
              <div className="absolute right-0 top-11 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-stone-100">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                    {selectedBook} — {totalChapters} Chapters
                  </p>
                </div>
                <div className="p-3 grid grid-cols-6 gap-1.5 max-h-[40vh] overflow-y-auto">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => goToChapter(selectedBook, ch)}
                      className={cn(
                        "aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                        ch === selectedChapter
                          ? "bg-bible-red text-white shadow-md shadow-bible-red/25"
                          : "text-stone-600 hover:bg-stone-100"
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font Size */}
          <button
            onClick={cycleFontSize}
            className="h-9 w-9 rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-center text-stone-500 font-bold text-sm"
            title={`Font size: ${fontSize}`}
          >
            A<span className="text-[10px]">A</span>
          </button>
        </div>

        {/* ═══ Reading Area ═══ */}
        <div
          className="flex-1 relative w-full pt-1 sm:pt-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-bible-red" />
              <p className="text-sm text-stone-400 font-medium">
                Loading {selectedBook} {selectedChapter}…
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
              <AlertCircle className="h-7 w-7 text-red-400" />
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button
                onClick={loadChapter}
                className="mt-2 px-4 py-2 rounded-lg bg-stone-100 text-sm font-medium text-stone-700 hover:bg-stone-200 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="py-8 sm:py-10">
              {/* Chapter heading */}
              <h1 className="text-center text-base sm:text-lg font-bold uppercase tracking-[0.2em] text-stone-800 mb-8 sm:mb-10">
                {selectedBook} {selectedChapter}
              </h1>

              {/* Verses */}
              <div className={cn("text-stone-800 px-4 sm:px-8", fontSizeClass)}>
                {verses.map((v) => (
                  <React.Fragment key={v.verse}>
                    <sup className="text-[0.55em] font-semibold text-bible-red/60 select-none relative top-[-0.5em] mr-[1px]">
                      {v.verse}
                    </sup>
                    <span>{v.text} </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Copyright */}
              {copyright && (
                <p className="text-[10px] text-stone-400 text-center mt-8 px-6 leading-relaxed">
                  {copyright}
                </p>
              )}

            </div>
          )}
        </div>

        {/* ═══ Chapter Nav — Floating ═══ */}
        <div 
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-10 left-0 right-0 z-30 pointer-events-none px-4 sm:px-6"
        >
          <div className="max-w-3xl mx-auto flex items-end justify-between w-full gap-4">
            {/* Previous */}
            {hasPrev ? (
              <button
                onClick={goPrev}
                className="pointer-events-auto flex items-center gap-3 pr-4 pl-1.5 py-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-stone-200/60 bg-white/95 backdrop-blur-md hover:bg-stone-50 active:scale-95 transition-all text-left group"
              >
                <div className="h-9 w-9 bg-stone-100 group-hover:bg-stone-200 rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-stone-600" />
                </div>
                <div className="min-w-0 pr-1">
                  <p className="text-[9px] uppercase tracking-wider text-stone-500 font-bold leading-tight">Previous</p>
                  <p className="text-[13px] font-bold text-stone-800 truncate leading-snug">
                    {prevChapter!.book} {prevChapter!.chapter}
                  </p>
                </div>
              </button>
            ) : (
              <div />
            )}

            {/* Next */}
            {hasNext ? (
              <button
                onClick={goNext}
                className="pointer-events-auto flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-stone-200/60 bg-white/95 backdrop-blur-md hover:bg-stone-50 active:scale-95 transition-all text-right group ml-auto"
              >
                <div className="min-w-0 pl-1">
                  <p className="text-[9px] uppercase tracking-wider text-stone-500 font-bold leading-tight">Next</p>
                  <p className="text-[13px] font-bold text-stone-800 truncate leading-snug">
                    {nextChapter!.book} {nextChapter!.chapter}
                  </p>
                </div>
                <div className="h-9 w-9 bg-bible-red/10 group-hover:bg-bible-red/20 rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <ChevronRight className="h-4 w-4 text-bible-red" />
                </div>
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Back to Top */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed z-40 h-10 w-10 rounded-full bg-stone-800 text-white shadow-lg shadow-stone-800/30 flex items-center justify-center transition-all hover:scale-110 animate-in fade-in zoom-in duration-200 right-4 lg:right-6 lg:bottom-10"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8.5rem)' }}
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </AppLayout>
  );
};

export default BibleReader;
