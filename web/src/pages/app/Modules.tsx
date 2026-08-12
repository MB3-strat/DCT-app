import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCheck, ClipboardCheck, Search, X } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { ModuleCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/data/modules";
import { CATEGORIES } from "@/data/meta";
import { useLibrary } from "@/context/LibraryContext";
import type { Category, Urgency } from "@/data/types";
import { cn } from "@/lib/utils";

const URGENCIES: Urgency[] = ["Emergency", "Urgent", "Routine", "Foundation"];

export default function Modules() {
  const [params, setParams] = useSearchParams();
  const catParam = params.get("cat") as Category | null;
  const [cat, setCat] = useState<Category | "all">(catParam ?? "all");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");
  const [q, setQ] = useState("");
  const { read, markAllRead } = useLibrary();
  const readModuleIds = new Set(read.filter((id) => id.startsWith("M")));
  const allModulesRead = readModuleIds.size >= MODULES.length;

  const filtered = useMemo(() => {
    return MODULES.filter((m) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (urgency !== "all" && m.urgency !== urgency) return false;
      if (q && !m.title.toLowerCase().includes(q.toLowerCase()) && !m.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [cat, urgency, q]);

  function selectCat(c: Category | "all") {
    setCat(c);
    if (c === "all") setParams({});
    else setParams({ cat: c });
  }

  return (
    <PageContainer>
      <PageHeading
        kicker="Handbook"
        title="Modules"
        description={`All ${MODULES.length} handbook modules, imported from the source handbook. Filter by category and urgency.`}
      />

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter modules…"
          className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={cat === "all"} onClick={() => selectCat("all")}>All categories</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} active={cat === c.key} onClick={() => selectCat(c.key)} emergency={c.emergency}>
            {c.icon} {c.label}
          </Chip>
        ))}
      </div>

      {/* Urgency chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Chip small active={urgency === "all"} onClick={() => setUrgency("all")}>All urgencies</Chip>
        {URGENCIES.map((u) => (
          <Chip key={u} small active={urgency === u} onClick={() => setUrgency(u)}>{u}</Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} module{filtered.length !== 1 ? "s" : ""}</p>
        {!allModulesRead && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAllRead(MODULES.map((module) => module.id))}
            className="w-full gap-1.5 rounded-full sm:w-auto"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No modules match those filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cat === "all" && urgency === "all" && !q && allModulesRead && (
            <Link
              to="/app/feedback-cpd"
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-brand-gold/45 bg-brand-gold/10 p-4 transition-all hover:border-brand-gold hover:shadow-[0_8px_24px_-12px_rgba(163,114,31,0.45)] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <ClipboardCheck className="h-7 w-7 text-brand-gold-ink" />
                <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold-ink">
                  Unlocked
                </span>
              </div>
              <h3 className="break-words font-serif text-lg font-semibold leading-tight text-foreground">
                Feedback &amp; CPD
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                Complete the feedback form after finishing all modules.
              </p>
              <div className="mt-auto pt-3 text-sm font-semibold text-brand-green">
                Open form
              </div>
            </Link>
          )}
          {filtered.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Chip({
  children, active, onClick, emergency, small,
}: {
  children: React.ReactNode; active: boolean; onClick: () => void; emergency?: boolean; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border font-semibold transition-colors",
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        active
          ? emergency
            ? "border-destructive bg-destructive text-destructive-foreground"
            : "border-brand-green bg-brand-green text-white"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
