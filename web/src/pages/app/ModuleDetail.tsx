import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Check, AlertTriangle,
  FileWarning, ShieldQuestion,
} from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { ClinicalItem } from "@/components/ClinicalText";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { getModuleBySlug } from "@/data/modules";
import { useLibrary } from "@/context/LibraryContext";
import { cn } from "@/lib/utils";

/** Sections whose heading signals a red-flag / warning block. */
function isRedFlag(heading: string): boolean {
  return /red flag|🚩|⚠/i.test(heading);
}

export default function ModuleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const module = slug ? getModuleBySlug(slug) : undefined;
  const { isBookmarked, toggleBookmark, pushRecent, markRead } = useLibrary();

  useEffect(() => {
    if (module) pushRecent(module.id, "module");
  }, [module, pushRecent]);

  if (!module) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Module not found.</p>
        <Link to="/app/modules" className="text-brand-green hover:underline">Back to modules</Link>
      </PageContainer>
    );
  }

  const bookmarked = isBookmarked(module.id);

  return (
    <PageContainer className="max-w-4xl">
      <Link to="/app/modules" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Modules
      </Link>

      {/* Header */}
      <div className="hero-gradient rounded-2xl p-6 text-white md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
            {module.category}
          </span>
          <UrgencyBadge urgency={module.urgency} className="border-white/20 bg-white/15 text-white" />
          <span className="text-[11px] uppercase tracking-wide text-white/50">{module.id}</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">{module.title}</h1>
        {module.quote && <p className="mt-3 max-w-2xl text-lg italic text-white/80">{module.quote}</p>}
        {module.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {module.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/70">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => toggleBookmark(module.id)}
          aria-pressed={bookmarked}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            bookmarked ? "border-brand-gold bg-brand-gold/15 text-brand-gold-ink" : "border-border hover:bg-muted",
          )}
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <Link to="/app/report/clinical" state={{ contentId: module.id, title: module.title }} className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <FileWarning className="h-4 w-4" /> <span className="hidden sm:inline">Report issue</span>
        </Link>
      </div>

      <DisclaimerBanner className="mt-6" compact />

      {/* Sections */}
      <div className="mt-6 space-y-4">
        {module.sections.map((section, i) => {
          const red = isRedFlag(section.heading);
          return (
            <section
              key={i}
              className={cn(
                "rounded-xl border p-5",
                red ? "border-destructive/30 bg-destructive/[0.04]" : "border-border bg-card",
              )}
            >
              {section.heading && (
                <h2 className={cn(
                  "mb-3 flex items-center gap-2 font-serif text-xl font-semibold",
                  red && "text-destructive",
                )}>
                  {red && <AlertTriangle className="h-5 w-5" />}
                  {section.heading}
                </h2>
              )}
              <div>
                {section.items.map((item, j) => (
                  <ClinicalItem key={j} text={item} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Review / source metadata */}
      <section className="mt-6 rounded-xl border border-border bg-muted/40 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
          <ShieldQuestion className="h-5 w-5 text-muted-foreground" /> Sources &amp; review
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Meta k="Content version" v={module.version} />
          <Meta k="Status" v={module.status} />
          <Meta k="Clinical owner" v={module.clinicalOwner} review />
          <Meta k="Last reviewed" v={module.lastReviewed} review />
          <Meta k="Next review" v={module.nextReview} review />
          <Meta k="Category" v={module.category} />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Clinical wording is imported verbatim from the source handbook. Review
          dates and ownership metadata are marked as needing clinical review
          where not supplied in the source files.
        </p>
      </section>

      <div className="mt-8 flex items-center justify-center">
        <button
          onClick={() => {
            markRead(module.id);
            navigate("/app/modules");
          }}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-mid"
        >
          <Check className="h-4 w-4" /> Mark complete &amp; continue
        </button>
      </div>
    </PageContainer>
  );
}

function Meta({ k, v, review }: { k: string; v: string; review?: boolean }) {
  const needs = review && /needs clinical review/i.test(v);
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className={cn("font-medium", needs && "text-brand-gold-ink")}>{v}</dd>
    </div>
  );
}
