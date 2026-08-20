/**
 * Thin, typed localStorage helpers.
 * All persistence is namespaced so it can later be swapped for a backend
 * (Firestore) sync layer without touching call sites.
 */

const NS = "dct:";

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal for an educational app */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* noop */
  }
}
