import { useCallback, useEffect, useRef, useState } from "react";

// One hour of no interaction anywhere in this browser, then a short warning
// window before the session is actually ended. Everything here is driven by
// localStorage rather than a plain in-memory timer, for two reasons:
//   1. Multiple tabs of the app share one "last activity" clock — being
//      active in one tab keeps the others from warning/logging out too.
//   2. It survives the tab being closed and reopened. If someone was idle
//      for two hours and comes back, they should be logged out immediately
//      on load, not get a fresh hour just because the timer restarted.
const ACTIVITY_KEY = "dct:last-activity";
const IDLE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const WARNING_MS = 60 * 1000; // show the "signing you out" countdown for the last 60s
const CHECK_INTERVAL_MS = 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 5000; // don't hit localStorage on every mousemove

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;

function readLastActivity(): number {
  const raw = window.localStorage.getItem(ACTIVITY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function writeLastActivity(ts: number) {
  window.localStorage.setItem(ACTIVITY_KEY, String(ts));
}

/**
 * Signs the user out after IDLE_LIMIT_MS of no interaction, showing a
 * countdown for the final WARNING_MS so it's never a surprise. Any activity
 * during the countdown is ignored on purpose — only the explicit "stay
 * signed in" action (via `stayActive`) should cancel it, otherwise a mouse
 * resting near the cursor could silently swallow the warning.
 */
export function useIdleLogout(enabled: boolean, onTimeout: () => void) {
  const [secondsLeft, setSecondsLeftState] = useState<number | null>(null);
  const secondsLeftRef = useRef<number | null>(null);
  const lastWriteRef = useRef(0);
  const onTimeoutRef = useRef(onTimeout);
  const firedRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const setSecondsLeft = useCallback((value: number | null) => {
    secondsLeftRef.current = value;
    setSecondsLeftState(value);
  }, []);

  const recordActivity = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastWriteRef.current = now;
    writeLastActivity(now);
  }, []);

  const stayActive = useCallback(() => {
    firedRef.current = false;
    recordActivity(true);
    setSecondsLeft(null);
  }, [recordActivity, setSecondsLeft]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);
      return;
    }

    // Fresh session (e.g. just logged in) starts a fresh hour, not whatever
    // stale timestamp is left over from a previous session in this browser.
    firedRef.current = false;
    recordActivity(true);

    const handleActivity = () => {
      if (secondsLeftRef.current !== null) return; // warning showing — ignore ambient activity
      recordActivity();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    // Another tab recorded activity — clear our warning too, since the
    // person is clearly still around.
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_KEY && secondsLeftRef.current !== null) {
        setSecondsLeft(null);
      }
    };
    window.addEventListener("storage", handleStorage);

    const checkIdle = () => {
      const idleFor = Date.now() - readLastActivity();
      if (idleFor >= IDLE_LIMIT_MS) {
        if (!firedRef.current) {
          firedRef.current = true;
          setSecondsLeft(null);
          onTimeoutRef.current();
        }
        return;
      }
      if (idleFor >= IDLE_LIMIT_MS - WARNING_MS) {
        setSecondsLeft(Math.max(0, Math.ceil((IDLE_LIMIT_MS - idleFor) / 1000)));
      } else if (secondsLeftRef.current !== null) {
        setSecondsLeft(null);
      }
    };

    const intervalId = window.setInterval(checkIdle, CHECK_INTERVAL_MS);
    // Background tabs get throttled by the browser — catch up the instant
    // this tab is looked at again instead of waiting for the next tick.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkIdle();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    checkIdle();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [enabled, recordActivity, setSecondsLeft]);

  return { secondsLeft, stayActive };
}
