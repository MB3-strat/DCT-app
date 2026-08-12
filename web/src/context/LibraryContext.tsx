import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/**
 * Bookmarks, read-progress and recently-viewed state.
 * Persisted to localStorage for now; the shape is intentionally
 * backend-friendly (arrays of content ids) so it can sync to a
 * user account later without changing consumers.
 */

export interface RecentEntry {
  id: string;
  kind: "module" | "toolkit";
  at: number;
}

interface LibraryValue {
  bookmarks: string[];
  read: string[];
  recent: RecentEntry[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (id: string) => void;
  isRead: (id: string) => boolean;
  toggleRead: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  syncReadProgress: (ids: string[]) => Promise<void>;
  pushRecent: (id: string, kind: "module" | "toolkit") => void;
  clearRecent: () => void;
  checklistState: Record<string, number[]>;
  toggleChecklistItem: (toolkitId: string, index: number) => void;
  resetChecklist: (toolkitId: string) => void;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<string[]>(() =>
    readJSON<string[]>("bookmarks", []),
  );
  const [read, setRead] = useState<string[]>(() => readJSON<string[]>("read", []));
  const [recent, setRecent] = useState<RecentEntry[]>(() =>
    readJSON<RecentEntry[]>("recent", []),
  );
  const [checklistState, setChecklistState] = useState<Record<string, number[]>>(
    () => readJSON<Record<string, number[]>>("checklists", {}),
  );

  useEffect(() => writeJSON("bookmarks", bookmarks), [bookmarks]);
  useEffect(() => writeJSON("read", read), [read]);
  useEffect(() => writeJSON("recent", recent), [recent]);
  useEffect(() => writeJSON("checklists", checklistState), [checklistState]);

  useEffect(() => {
    if (!supabase || !user) return;

    let cancelled = false;

    async function loadRemote() {
      const [{ data: bookmarkRows }, { data: progressRows }] = await Promise.all([
        supabase.from("bookmarks").select("content_id").eq("user_id", user.id),
        supabase.from("progress").select("content_id,kind,completed_item_indexes,read").eq("user_id", user.id),
      ]);

      if (cancelled) return;

      setBookmarks(bookmarkRows?.map((row) => row.content_id) ?? []);
      setRead(progressRows?.filter((row) => row.read).map((row) => row.content_id) ?? []);
      setChecklistState(
        Object.fromEntries(
          (progressRows ?? [])
            .filter((row) => row.kind === "toolkit" && Array.isArray(row.completed_item_indexes))
            .map((row) => [row.content_id, row.completed_item_indexes]),
        ),
      );
    }

    void loadRemote();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!supabase || !user) return;

    void supabase.from("bookmarks").delete().eq("user_id", user.id).then(async () => {
      if (bookmarks.length) {
        await supabase.from("bookmarks").insert(
          bookmarks.map((id) => ({
            user_id: user.id,
            content_id: id,
            kind: id.startsWith("T") ? "toolkit" : "module",
          })),
        );
      }
    });
  }, [bookmarks, user]);

  useEffect(() => {
    if (!supabase || !user) return;

    const readRows = read.map((id) => ({
      user_id: user.id,
      content_id: id,
      kind: id.startsWith("T") ? "toolkit" : "module",
      read: true,
      updated_at: new Date().toISOString(),
    }));

    const checklistRows = Object.entries(checklistState).map(([id, indexes]) => ({
      user_id: user.id,
      content_id: id,
      kind: "toolkit",
      completed_item_indexes: indexes,
      updated_at: new Date().toISOString(),
    }));

    void supabase.from("progress").upsert([...readRows, ...checklistRows], {
      onConflict: "user_id,content_id",
    });
  }, [read, checklistState, user]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
    );
  }, []);

  const toggleRead = useCallback((id: string) => {
    setRead((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const markRead = useCallback((id: string) => {
    setRead((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markAllRead = useCallback((ids: string[]) => {
    setRead((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);

  const syncReadProgress = useCallback(async (ids: string[]) => {
    setRead((prev) => Array.from(new Set([...prev, ...ids])));

    if (!supabase || !user || ids.length === 0) return;

    const rows = ids.map((id) => ({
      user_id: user.id,
      content_id: id,
      kind: id.startsWith("T") ? "toolkit" : "module",
      read: true,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("progress").upsert(rows, {
      onConflict: "user_id,content_id",
    });

    if (error) throw error;
  }, [user]);

  const pushRecent = useCallback((id: string, kind: "module" | "toolkit") => {
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      return [{ id, kind, at: Date.now() }, ...filtered].slice(0, 20);
    });
  }, []);

  const clearRecent = useCallback(() => setRecent([]), []);

  const toggleChecklistItem = useCallback((toolkitId: string, index: number) => {
    setChecklistState((prev) => {
      const cur = prev[toolkitId] ?? [];
      const next = cur.includes(index)
        ? cur.filter((i) => i !== index)
        : [...cur, index];
      return { ...prev, [toolkitId]: next };
    });
  }, []);

  const resetChecklist = useCallback((toolkitId: string) => {
    setChecklistState((prev) => ({ ...prev, [toolkitId]: [] }));
  }, []);

  const value = useMemo<LibraryValue>(
    () => ({
      bookmarks,
      read,
      recent,
      isBookmarked: (id) => bookmarks.includes(id),
      toggleBookmark,
      isRead: (id) => read.includes(id),
      toggleRead,
      markRead,
      markAllRead,
      syncReadProgress,
      pushRecent,
      clearRecent,
      checklistState,
      toggleChecklistItem,
      resetChecklist,
    }),
    [
      bookmarks,
      read,
      recent,
      toggleBookmark,
      toggleRead,
      markRead,
      markAllRead,
      syncReadProgress,
      pushRecent,
      clearRecent,
      checklistState,
      toggleChecklistItem,
      resetChecklist,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
