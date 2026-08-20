import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { readJSON, writeJSON } from "@/lib/storage";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

/**
 * Bookmarks, read-progress and recently-viewed state.
 * Persisted to localStorage first, synced to Firestore
 * (profiles/{uid}/bookmarks, profiles/{uid}/progress) when signed in.
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

  // Tracks what's already been written to Firestore, so writes only sync
  // the delta instead of re-writing every doc on every local change.
  const syncedBookmarks = useRef<Set<string>>(new Set());
  const syncedProgress = useRef<Set<string>>(new Set());

  useEffect(() => writeJSON("bookmarks", bookmarks), [bookmarks]);
  useEffect(() => writeJSON("read", read), [read]);
  useEffect(() => writeJSON("recent", recent), [recent]);
  useEffect(() => writeJSON("checklists", checklistState), [checklistState]);

  useEffect(() => {
    if (!db || !user) return;

    let cancelled = false;

    async function loadRemote() {
      const [bookmarkSnap, progressSnap] = await Promise.all([
        getDocs(collection(db!, "profiles", user!.id, "bookmarks")),
        getDocs(collection(db!, "profiles", user!.id, "progress")),
      ]);

      if (cancelled) return;

      const bookmarkIds = bookmarkSnap.docs.map((d) => d.id);
      syncedBookmarks.current = new Set(bookmarkIds);
      setBookmarks(bookmarkIds);

      interface ProgressDoc {
        id: string;
        kind?: "module" | "toolkit";
        read?: boolean;
        completedItemIndexes?: number[];
      }
      const progressDocs: ProgressDoc[] = progressSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      syncedProgress.current = new Set(progressDocs.map((d) => d.id));
      setRead(progressDocs.filter((d) => d.read).map((d) => d.id));
      setChecklistState(
        Object.fromEntries(
          progressDocs
            .filter((d) => d.kind === "toolkit" && Array.isArray(d.completedItemIndexes))
            .map((d) => [d.id, d.completedItemIndexes as number[]]),
        ),
      );
    }

    void loadRemote();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!db || !user) return;

    const current = new Set(bookmarks);
    const previous = syncedBookmarks.current;
    const toAdd = bookmarks.filter((id) => !previous.has(id));
    const toRemove = [...previous].filter((id) => !current.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) return;

    const batch = writeBatch(db);
    for (const id of toAdd) {
      batch.set(doc(db, "profiles", user.id, "bookmarks", id), {
        kind: id.startsWith("T") ? "toolkit" : "module",
        createdAt: serverTimestamp(),
      });
    }
    for (const id of toRemove) {
      batch.delete(doc(db, "profiles", user.id, "bookmarks", id));
    }
    void batch.commit().then(() => {
      syncedBookmarks.current = current;
    });
  }, [bookmarks, user]);

  useEffect(() => {
    if (!db || !user) return;

    const readIds = new Set(read);
    const checklistIds = Object.keys(checklistState);
    const touchedIds = new Set([...readIds, ...checklistIds]);
    const toSync = [...touchedIds].filter((id) => {
      // Re-sync anything not yet written, or whose checklist progress changed.
      return !syncedProgress.current.has(id) || checklistIds.includes(id);
    });
    if (toSync.length === 0) return;

    const batch = writeBatch(db);
    for (const id of toSync) {
      batch.set(
        doc(db, "profiles", user.id, "progress", id),
        {
          kind: id.startsWith("T") ? "toolkit" : "module",
          read: readIds.has(id),
          completedItemIndexes: checklistState[id] ?? [],
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    void batch.commit().then(() => {
      syncedProgress.current = new Set([...syncedProgress.current, ...touchedIds]);
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

  const syncReadProgress = useCallback(
    async (ids: string[]) => {
      setRead((prev) => Array.from(new Set([...prev, ...ids])));

      if (!db || !user || ids.length === 0) return;

      const batch = writeBatch(db);
      for (const id of ids) {
        batch.set(
          doc(db, "profiles", user.id, "progress", id),
          {
            kind: id.startsWith("T") ? "toolkit" : "module",
            read: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
      await batch.commit();
      syncedProgress.current = new Set([...syncedProgress.current, ...ids]);
    },
    [user],
  );

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
