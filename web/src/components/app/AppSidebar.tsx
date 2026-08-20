import { NavLink } from "react-router-dom";
import {
  Home,
  BookOpen,
  Wrench,
  Siren,
  Bookmark,
  User,
  Shield,
  FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { PRODUCT } from "@/data/meta";

const NAV = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/modules", label: "Modules", icon: BookOpen },
  { to: "/app/toolkits", label: "Toolkits", icon: Wrench },
  { to: "/app/on-call", label: "On-Call", icon: Siren, emergency: true },
  { to: "/app/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/app/account", label: "Account", icon: User },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin, user, logout } = useAuth();

  return (
    <nav className="flex h-full flex-col gap-1 bg-sidebar px-3 py-4 text-sidebar-foreground">
      <NavLink
        to="/app"
        end
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2 px-2"
      >
        <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-sidebar-primary">
          <img src="/dct-logo.png" alt="" className="h-full w-full object-cover" />
        </span>
        <div className="leading-tight">
          <div className="font-serif text-base font-semibold text-white">
            {PRODUCT.name}
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
            {PRODUCT.tagline}
          </div>
        </div>
      </NavLink>

      <div className="flex-1 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? item.emergency
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                item.emergency && "font-semibold",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/app/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
              )
            }
          >
            <Shield className="h-[18px] w-[18px]" aria-hidden />
            Admin
          </NavLink>
        )}
      </div>

      <NavLink
        to="/app/disclaimer"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 transition-colors hover:text-white"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Disclaimer &amp; intended use
      </NavLink>

      {/* Pinned account identity + one-click sign out — previously the only
          way to sign out was hamburger/sidebar → Account → scroll down to
          find the button. This puts it one click away everywhere, on both
          desktop (this is the sidebar itself) and mobile (this same
          component renders inside the drawer — see AppLayout.tsx). */}
      {user && (
        <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-3">
          <NavLink
            to="/app/account"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green font-serif text-sm font-bold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-white">{user.name}</span>
              <span className="block truncate text-xs text-sidebar-foreground/60">{user.email}</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </nav>
  );
}
