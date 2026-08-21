import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, type Timestamp } from "firebase/firestore";
import { AlertTriangle, Download, Loader2, RefreshCw, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";

interface FeedbackDoc {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  usefulness: string;
  sections: string[];
  confidenceBefore: string;
  confidenceAfter: string;
  changedApproach: string;
  valuableLearning: string;
  missing: string;
  improvements: string;
  recommend: string;
  rating: number;
  comments: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

function formatDate(ts: Timestamp | null | undefined) {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function tally(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

function Distribution({ title, values, order }: { title: string; values: string[]; order: string[] }) {
  const counts = tally(values);
  const max = Math.max(1, ...order.map((o) => counts.get(o) ?? 0));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-serif text-base font-semibold">{title}</h3>
      <div className="mt-3 space-y-1.5">
        {order.map((label) => {
          const count = counts.get(label) ?? 0;
          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-32 flex-shrink-0 truncate text-muted-foreground">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-brand-green" style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <span className="w-5 flex-shrink-0 text-right font-semibold">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminFeedbackTab() {
  const [data, setData] = useState<FeedbackDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!db) {
      setError("This environment isn't connected to Firebase.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")));
      setData(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            userId: (v.userId as string | null) ?? null,
            userName: (v.userName as string) || "",
            userEmail: (v.userEmail as string) || "",
            usefulness: (v.usefulness as string) || "",
            sections: (v.sections as string[]) || [],
            confidenceBefore: (v.confidenceBefore as string) || "",
            confidenceAfter: (v.confidenceAfter as string) || "",
            changedApproach: (v.changedApproach as string) || "",
            valuableLearning: (v.valuableLearning as string) || "",
            missing: (v.missing as string) || "",
            improvements: (v.improvements as string) || "",
            recommend: (v.recommend as string) || "",
            rating: (v.rating as number) || 0,
            comments: (v.comments as string) || "",
            createdAt: (v.createdAt as Timestamp) || null,
            updatedAt: (v.updatedAt as Timestamp) || null,
          } satisfies FeedbackDoc;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const avgRating = data.reduce((sum, f) => sum + f.rating, 0) / data.length;
    const wouldRecommend = data.filter((f) => f.recommend === "Definitely" || f.recommend === "Probably").length;
    return { total: data.length, avgRating, wouldRecommend };
  }, [data]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      "dct-feedback.csv",
      ["Name", "Email", "Rating", "Usefulness", "Recommend", "Confidence before", "Confidence after", "Changed approach", "Sections", "Valuable learning", "Missing", "Improvements", "Comments", "Submitted"],
      data.map((f) => [
        f.userName,
        f.userEmail,
        String(f.rating),
        f.usefulness,
        f.recommend,
        f.confidenceBefore,
        f.confidenceAfter,
        f.changedApproach,
        f.sections.join("; "),
        f.valuableLearning,
        f.missing,
        f.improvements,
        f.comments,
        formatDate(f.createdAt),
      ]),
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading feedback...
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
        <p className="font-semibold">No feedback yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Responses to the Feedback & CPD survey will appear here once users start submitting it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-serif text-2xl font-semibold">{stats?.total}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Responses</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1 font-serif text-2xl font-semibold text-brand-gold-ink">
              {stats?.avgRating.toFixed(1)} <Star className="h-4 w-4 fill-current" />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">Average rating</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-serif text-2xl font-semibold text-success">{stats?.wouldRecommend}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Would recommend</div>
          </div>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Distribution
          title="Usefulness"
          values={data.map((f) => f.usefulness)}
          order={["Extremely useful", "Very useful", "Useful", "Somewhat useful", "Not useful"]}
        />
        <Distribution
          title="Would recommend"
          values={data.map((f) => f.recommend)}
          order={["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"]}
        />
      </div>

      <div className="space-y-3">
        {data.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{f.userName || "—"}</p>
                <p className="text-xs text-muted-foreground">{f.userEmail || "—"}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn("h-3.5 w-3.5", n <= f.rating ? "fill-current text-brand-gold-ink" : "text-muted-foreground/30")} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(f.createdAt)}</span>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Usefulness</dt>
                <dd className="font-medium">{f.usefulness || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Recommend</dt>
                <dd className="font-medium">{f.recommend || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Confidence</dt>
                <dd className="font-medium">{f.confidenceBefore || "—"} → {f.confidenceAfter || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Changed approach</dt>
                <dd className="font-medium">{f.changedApproach || "—"}</dd>
              </div>
            </dl>

            {(f.valuableLearning || f.missing || f.improvements || f.comments) && (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                {f.valuableLearning && <p><span className="font-semibold">Most valuable: </span>{f.valuableLearning}</p>}
                {f.missing && <p><span className="font-semibold">Missing: </span>{f.missing}</p>}
                {f.improvements && <p><span className="font-semibold">Suggested improvements: </span>{f.improvements}</p>}
                {f.comments && <p><span className="font-semibold">Comments: </span>{f.comments}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
