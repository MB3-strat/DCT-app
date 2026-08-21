import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { AlertTriangle, Check, ChevronDown, Download, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

interface IssueDoc {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  issueType: "technical" | "clinical" | string;
  title: string;
  description: string;
  url: string;
  status: string;
  adminResponse: string;
  contentId?: string;
  contactOk?: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

type StatusFilter = "all" | "open" | "in-progress" | "resolved";
type TypeFilter = "all" | "technical" | "clinical";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  "in-progress": "bg-brand-gold/20 text-brand-gold-ink",
  resolved: "bg-success/12 text-success",
};

function formatDate(ts: Timestamp | null | undefined) {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

export function AdminIssuesTab() {
  const [data, setData] = useState<IssueDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    if (!db) {
      setError("This environment isn't connected to Firebase.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, "reportedIssues"), orderBy("createdAt", "desc")));
      setData(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            userId: (v.userId as string | null) ?? null,
            userName: (v.userName as string | null) ?? null,
            userEmail: (v.userEmail as string | null) ?? null,
            issueType: (v.issueType as string) || "technical",
            title: (v.title as string) || "",
            description: (v.description as string) || "",
            url: (v.url as string) || "",
            status: (v.status as string) || "open",
            adminResponse: (v.adminResponse as string) || "",
            contentId: v.contentId as string | undefined,
            contactOk: v.contactOk as boolean | undefined,
            createdAt: (v.createdAt as Timestamp) || null,
            updatedAt: (v.updatedAt as Timestamp) || null,
          } satisfies IssueDoc;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reported issues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.issueType !== typeFilter) return false;
      if (q) {
        const haystack = `${i.userName ?? ""} ${i.userEmail ?? ""} ${i.title} ${i.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, typeFilter]);

  const counts = useMemo(() => {
    if (!data) return { open: 0, inProgress: 0, resolved: 0 };
    return {
      open: data.filter((i) => i.status === "open").length,
      inProgress: data.filter((i) => i.status === "in-progress").length,
      resolved: data.filter((i) => i.status === "resolved").length,
    };
  }, [data]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      "dct-reported-issues.csv",
      ["Type", "Status", "Title", "Description", "Name", "Email", "Page", "Response", "Submitted"],
      data.map((i) => [
        i.issueType,
        STATUS_LABELS[i.status] ?? i.status,
        i.title,
        i.description,
        i.userName ?? "(anonymised)",
        i.userEmail ?? "(anonymised)",
        i.url,
        i.adminResponse,
        formatDate(i.createdAt),
      ]),
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading reported issues...
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

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="font-semibold">No reported issues</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Reports submitted through the clinical and technical issue flows will appear here for triage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="font-serif text-2xl font-semibold text-destructive">{counts.open}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Open</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="font-serif text-2xl font-semibold text-brand-gold-ink">{counts.inProgress}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">In progress</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="font-serif text-2xl font-semibold text-success">{counts.resolved}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Resolved</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or description..."
            className="h-9 w-full rounded-full border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-full border border-input bg-card px-3 text-sm outline-none focus:border-brand-green"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in-progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="h-9 rounded-full border border-input bg-card px-3 text-sm outline-none focus:border-brand-green"
        >
          <option value="all">All types</option>
          <option value="technical">Technical</option>
          <option value="clinical">Clinical</option>
        </select>

        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>

        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            expanded={expanded === issue.id}
            onToggle={() => setExpanded((prev) => (prev === issue.id ? null : issue.id))}
            onSaved={(patch) => setData((prev) => prev?.map((i) => (i.id === issue.id ? { ...i, ...patch } : i)) ?? prev)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No issues match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  expanded,
  onToggle,
  onSaved,
}: {
  issue: IssueDoc;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (patch: Partial<IssueDoc>) => void;
}) {
  const [status, setStatus] = useState(issue.status);
  const [response, setResponse] = useState(issue.adminResponse);
  const [saving, setSaving] = useState(false);
  const dirty = status !== issue.status || response !== issue.adminResponse;

  async function save() {
    if (!db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "reportedIssues", issue.id), {
        status,
        adminResponse: response,
        updatedAt: serverTimestamp(),
      });
      onSaved({ status, adminResponse: response });
      toast.success("Saved.");
    } catch {
      toast.error("Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <ChevronDown className={cn("mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[status] ?? STATUS_STYLES.open)}>
              {STATUS_LABELS[status] ?? status}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
              {issue.issueType}
            </span>
            <p className="truncate font-semibold">{issue.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {issue.userName ?? "(anonymised)"} · {issue.userEmail ?? "no email on record"} · {formatDate(issue.createdAt)}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border p-4">
          <p className="whitespace-pre-wrap text-sm">{issue.description}</p>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {issue.contentId && <span>Content: {issue.contentId}</span>}
            {issue.url && (
              <a href={issue.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                Page reported from <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {issue.contactOk !== undefined && <span>{issue.contactOk ? "OK to contact" : "Prefers not to be contacted"}</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-brand-green"
              >
                <option value="open">Open</option>
                <option value="in-progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Internal response / notes</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder="Notes on how this was investigated or resolved..."
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand-green"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-green px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-green-mid disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            {!dirty && <span className="text-xs text-muted-foreground">Up to date</span>}
          </div>
        </div>
      )}
    </div>
  );
}
