import { useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { DisclaimerGate } from "@/components/app/DisclaimerGate";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const DISCLAIMER_SESSION_KEY = "dct:disclaimer-accepted";

export function AppLayout() {
  const { isAuthed, isSubscribed, isAdmin, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    () => window.sessionStorage.getItem(DISCLAIMER_SESSION_KEY) === "true",
  );
  const location = useLocation();
  const requireSubscription = import.meta.env.VITE_REQUIRE_SUBSCRIPTION === "true";

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Checking account...</div>;
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  if (!disclaimerAccepted) {
    return (
      <DisclaimerGate
        onAccept={() => {
          window.sessionStorage.setItem(DISCLAIMER_SESSION_KEY, "true");
          setDisclaimerAccepted(true);
        }}
      />
    );
  }

  if (requireSubscription && !isSubscribed && !isAdmin && location.pathname !== "/app/billing") {
    return <Navigate to="/app/billing" replace />;
  }

  return (
    <div className="fixed inset-0 flex w-full max-w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 bg-sidebar md:block">
        <AppSidebar />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-in-up">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/80 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <AppSidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn("flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-background")}>
        <AppHeader onOpenMenu={() => setMenuOpen(true)} />
        <main
          id="app-scroll-container"
          className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-background pb-24 md:pb-8"
        >
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
