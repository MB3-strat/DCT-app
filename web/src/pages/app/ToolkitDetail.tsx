import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Bookmark, BookmarkCheck, RotateCcw, AlertTriangle,
  PhoneCall, Clock, FileWarning, Check, ExternalLink,
} from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { getToolkitBySlug } from "@/data/toolkits";
import { getModuleById } from "@/data/modules";
import { useLibrary } from "@/context/LibraryContext";
import { cn } from "@/lib/utils";

function isEmbeddedPdf(url: string): boolean {
  return url.startsWith("/forms/") && url.toLowerCase().endsWith(".pdf");
}

export default function ToolkitDetail() {
  const { slug } = useParams();
  const toolkit = slug ? getToolkitBySlug(slug) : undefined;
  const {
    isBookmarked, toggleBookmark, pushRecent,
    checklistState, toggleChecklistItem, resetChecklist,
  } = useLibrary();

  useEffect(() => {
    if (toolkit) pushRecent(toolkit.id, "toolkit");
  }, [toolkit, pushRecent]);

  if (!toolkit) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Toolkit not found.</p>
        <Link to="/app/toolkits" className="text-brand-green hover:underline">Back to toolkits</Link>
      </PageContainer>
    );
  }

  const bookmarked = isBookmarked(toolkit.id);
  const checked = checklistState[toolkit.id] ?? [];
  const items = toolkit.items ?? [];
  const progress = items.length ? Math.round((checked.length / items.length) * 100) : 0;
  const related = (toolkit.relatedModules ?? []).map((id) => getModuleById(id)).filter(Boolean);

  return (
    <PageContainer className="max-w-3xl">
      <Link to="/app/toolkits" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Toolkits
      </Link>

      <div
        className={cn(
          "rounded-2xl p-6 text-white md:p-8",
          toolkit.urgency === "Emergency" ? "emergency-gradient" : "hero-gradient",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-3xl" aria-hidden>{toolkit.icon}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">{toolkit.type}</span>
          <UrgencyBadge urgency={toolkit.urgency} className="border-white/20 bg-white/15 text-white" />
          <span className="text-[11px] uppercase tracking-wide text-white/50">{toolkit.id}</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight">{toolkit.title}</h1>
        <p className="mt-2 max-w-xl text-white/80">{toolkit.introduction}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => toggleBookmark(toolkit.id)}
          aria-pressed={bookmarked}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            bookmarked ? "border-brand-gold bg-brand-gold/15 text-brand-gold-ink" : "border-border hover:bg-muted",
          )}
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <Link to="/app/report/clinical" state={{ contentId: toolkit.id, title: toolkit.title }} className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <FileWarning className="h-4 w-4" /> <span className="hidden sm:inline">Report issue</span>
        </Link>
      </div>

      {/* Placeholder state */}
      {toolkit.placeholder ? (
        <div className="mt-6 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-brand-gold-ink" />
          <h2 className="font-serif text-xl font-semibold text-brand-gold-ink">Content pending clinical review</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-gold-ink/90">
            This toolkit is named in the source prototype but its full content
            was not available in the uploaded files. To preserve clinical
            safety, no instructions have been generated here. The clinical author
            has this content in the handbook and it will follow as an update.
          </p>
        </div>
      ) : (
        <>
          <DisclaimerBanner className="mt-6" compact />

          {/* Algorithm steps */}
          {toolkit.steps && (
            <div className="mt-6 space-y-3">
              {toolkit.steps.map((step, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-[15px] leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}

          {toolkit.links && toolkit.links.length > 0 && (
            <div className="mt-6 grid gap-3">
              {toolkit.links.map((link) => {
                const className = "flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-[15px] font-semibold transition-colors hover:border-brand-green/40 hover:bg-muted/50";
                const content = (
                  <>
                    <span className="min-w-0 flex-1 break-words">{link.label}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </>
                );

                if (isEmbeddedPdf(link.url)) {
                  return (
                    <Link
                      key={link.url}
                      to={`/app/pdf-viewer?src=${encodeURIComponent(link.url)}&title=${encodeURIComponent(link.label)}`}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          )}

          {/* Interactive checklist / form */}
          {items.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  {checked.length} / {items.length} complete
                </span>
                <button
                  onClick={() => resetChecklist(toolkit.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-brand-green transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const on = checked.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleChecklistItem(toolkit.id, i)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left shadow-sm transition-all",
                        on ? "border-brand-green/45 bg-brand-green/[0.08]" : "border-border bg-card hover:border-brand-green/30 hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 shadow-sm transition-colors",
                          on ? "border-brand-green bg-brand-green text-white" : "border-brand-green/30 bg-background text-transparent",
                        )}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                      </span>
                      <span className={cn("min-w-0 text-[15px] leading-relaxed", on && "text-muted-foreground line-through")}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Escalation */}
          {toolkit.escalation && !/needs clinical review/i.test(toolkit.escalation) && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-5">
              <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-destructive">
                <PhoneCall className="h-5 w-5" /> Escalation
              </h2>
              <p className="text-[15px] leading-relaxed">{toolkit.escalation}</p>
            </div>
          )}
        </>
      )}

      {/* Related modules */}
      {related.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-serif text-lg font-semibold">Related modules</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((m) => (
              <Link key={m!.id} to={`/app/modules/${m!.slug}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-brand-green/40">
                <span className="flex-1 text-sm font-medium">{m!.title}</span>
                <UrgencyBadge urgency={m!.urgency} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      <section className="mt-6 rounded-xl border border-border bg-muted/40 p-5 text-sm">
        <h2 className="mb-2 font-serif text-lg font-semibold">Sources &amp; review</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" /> Version {toolkit.version} · Last reviewed: {toolkit.lastReviewed}
        </div>
        <p className="mt-2 text-muted-foreground">{toolkit.sources}</p>
        <p className="mt-1 text-xs text-muted-foreground">Clinical owner: {toolkit.clinicalOwner}</p>
      </section>
    </PageContainer>
  );
}
