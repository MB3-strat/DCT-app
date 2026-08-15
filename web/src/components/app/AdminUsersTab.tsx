import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Mirrors the shape returned by functions/api/admin-users.ts. Kept as a
// local copy rather than a cross-directory import — the frontend and
// Functions sides have separate tsconfigs (Functions has Cloudflare Workers
// ambient types the Vite/DOM-targeted frontend config doesn't load), so
// importing types across that boundary isn't safe here.
interface AdminUserRow {
  uid: string;
  name: string;
  email: string;
  roles: string[];
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
  cpdPurchased: boolean;
  cpdPurchasedAt?: string;
  renewalReminderSentAt?: string;
}

interface AdminUsersResponse {
  users: AdminUserRow[];
  totals: {
    totalUsers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    cpdPurchased: number;
    reminderSent: number;
  };
}

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "trialing" | "canceled" | "past_due" | "none";
type YesNoFilter = "all" | "yes" | "no";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  canceled: "Canceled",
  past_due: "Past due",
  none: "No subscription",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/12 text-success",
  trialing: "bg-brand-green/12 text-brand-green",
  canceled: "bg-destructive/10 text-destructive",
  past_due: "bg-destructive/10 text-destructive",
  none: "bg-muted text-muted-foreground",
};

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

export function AdminUsersTab() {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cpdFilter, setCpdFilter] = useState<YesNoFilter>("all");
  const [reminderFilter, setReminderFilter] = useState<YesNoFilter>("all");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Please sign in again to view this page.");

      const response = await fetch("/api/admin-users", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load admin user data.");

      setData(payload as AdminUsersResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin user data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Runs once on mount — the reload button below covers manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to page 1 whenever a filter changes, so a narrower result set
  // never lands on a now-nonexistent page.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, cpdFilter, reminderFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && u.subscriptionStatus !== statusFilter) return false;
      if (cpdFilter === "yes" && !u.cpdPurchased) return false;
      if (cpdFilter === "no" && u.cpdPurchased) return false;
      if (reminderFilter === "yes" && !u.renewalReminderSentAt) return false;
      if (reminderFilter === "no" && u.renewalReminderSentAt) return false;
      return true;
    });
  }, [data, search, statusFilter, cpdFilter, reminderFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading user data...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { totals } = data;

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Total users" value={totals.totalUsers} />
        <StatTile label="Active subscriptions" value={totals.activeSubscriptions} accent="text-success" />
        <StatTile label="Expired / canceled" value={totals.expiredSubscriptions} accent="text-destructive" />
        <StatTile label="CPD certificates sold" value={totals.cpdPurchased} accent="text-brand-green" />
        <StatTile label="Renewal reminders sent" value={totals.reminderSent} accent="text-brand-gold-ink" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="h-9 w-full rounded-full border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-full border border-input bg-card px-3 text-sm outline-none focus:border-brand-green"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trial</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past due</option>
          <option value="none">No subscription</option>
        </select>

        <select
          value={cpdFilter}
          onChange={(e) => setCpdFilter(e.target.value as YesNoFilter)}
          className="h-9 rounded-full border border-input bg-card px-3 text-sm outline-none focus:border-brand-green"
        >
          <option value="all">CPD: all</option>
          <option value="yes">CPD: purchased</option>
          <option value="no">CPD: not purchased</option>
        </select>

        <select
          value={reminderFilter}
          onChange={(e) => setReminderFilter(e.target.value as YesNoFilter)}
          className="h-9 rounded-full border border-input bg-card px-3 text-sm outline-none focus:border-brand-green"
        >
          <option value="all">Reminder: all</option>
          <option value="yes">Reminder: sent</option>
          <option value="no">Reminder: not sent</option>
        </select>

        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">CPD</th>
              <th className="px-4 py-3">CPD generated</th>
              <th className="px-4 py-3">Reminder sent</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((u: AdminUserRow) => (
              <tr key={u.uid} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{u.name || "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2.5">
                  {u.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      STATUS_STYLES[u.subscriptionStatus] ?? STATUS_STYLES.none,
                    )}
                  >
                    {STATUS_LABELS[u.subscriptionStatus] ?? u.subscriptionStatus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.subscriptionExpiresAt)}</td>
                <td className="px-4 py-2.5">
                  {u.cpdPurchased ? (
                    <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">Yes</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">No</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.cpdPurchasedAt)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.renewalReminderSentAt)}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={cn("font-serif text-2xl font-semibold", accent)}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
