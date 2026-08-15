import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useIdleLogout } from "@/hooks/useIdleLogout";

/**
 * Signs the user out after an hour of no activity anywhere in this browser.
 * Deliberately not a dismiss-by-clicking-outside dialog: the only way past
 * the warning is the explicit "Stay signed in" button, since the whole
 * point is to end sessions nobody is actually at the keyboard for — a
 * stray click elsewhere on the page shouldn't quietly reset the clock.
 */
export function IdleTimeoutGuard() {
  const { isAuthed, logout } = useAuth();
  const loggingOutRef = useRef(false);

  const handleTimeout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    void logout().then(() => {
      toast.message("Signed out after an hour of inactivity.");
      loggingOutRef.current = false;
    });
  }, [logout]);

  const { secondsLeft, stayActive } = useIdleLogout(isAuthed, handleTimeout);

  // Keyboard users shouldn't need to reach for the mouse to stay signed in.
  useEffect(() => {
    if (secondsLeft === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") stayActive();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [secondsLeft, stayActive]);

  if (secondsLeft === null) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 animate-fade"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-desc"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-ink">
          <Clock className="h-6 w-6" />
        </div>
        <h2 id="idle-timeout-title" className="font-serif text-xl font-semibold">
          Still there?
        </h2>
        <p id="idle-timeout-desc" className="mt-2 text-sm text-muted-foreground">
          You've been inactive for a while. For security, you'll be signed out in
        </p>
        <div className="mt-3 font-serif text-4xl font-semibold tabular-nums text-brand-green">
          {secondsLeft}s
        </div>
        <Button type="button" onClick={stayActive} autoFocus className="mt-5 w-full rounded-full">
          Stay signed in
        </Button>
      </div>
    </div>
  );
}
