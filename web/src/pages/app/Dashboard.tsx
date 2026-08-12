import { Link } from "react-router-dom";
import {
  Siren, ArrowRight, Clock, Bookmark, WifiOff, RefreshCw,
  ChevronRight, Sparkles, ClipboardCheck,
} from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { ModuleCard, ToolkitCard } from "@/components/ContentCard";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, PRODUCT } from "@/data/meta";
import { MODULES, getModuleById } from "@/data/modules";
import { TOOLKITS, getToolkitById } from "@/data/toolkits";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOffline } from "@/context/OfflineContext";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { recent, bookmarks, read } = useLibrary();
  const { online, contentVersion, lastSync } = useOffline();

  const firstName = user?.name?.split(" ")[0] ?? "Doctor";
  const recentItems = recent.slice(0, 4);
  const bookmarkedModules = MODULES.filter((m) => bookmarks.includes(m.id)).slice(0, 3);
  const continueModule = recentItems.find((r) => r.kind === "module");
  const continueMod = continueModule ? getModuleById(continueModule.id) : MODULES[0];
  const quickToolkits = ["T01", "T02", "T03", "T05"].map((id) => getToolkitById(id)!).filter(Boolean);
  const readModuleIds = new Set(read.filter((id) => id.startsWith("M")));
  const progressPercent = Math.round((readModuleIds.size / MODULES.length) * 100);

  return (
    <PageContainer>
      {/* Hero greeting + continue */}
      <div className="hero-gradient relative mb-6 overflow-hidden rounded-2xl p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-gold/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              {greeting()}, {firstName}
            </div>
            <h1 className="mt-1 font-serif text-3xl font-semibold">Ready when the bleep goes.</h1>
            <p className="mt-1.5 max-w-md text-white/75">
              {PRODUCT.tagline} Jump straight to On-Call, or continue where you left off.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/app/on-call"
                className="emergency-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg"
              >
                <Siren className="h-4 w-4" /> Open On-Call
              </Link>
              <Link
                to="/app/modules"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Browse modules
              </Link>
            </div>
          </div>

          {continueMod && (
            <Link
              to={`/app/modules/${continueMod.slug}`}
              className="group w-full max-w-xs rounded-xl bg-white/10 p-4 backdrop-blur transition-colors hover:bg-white/15"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                <Clock className="h-3.5 w-3.5" /> Continue reading
              </div>
              <div className="mt-2 font-serif text-lg font-semibold">{continueMod.title}</div>
              <div className="mt-1 text-sm text-white/70 line-clamp-1">{continueMod.category}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-gold">
                Resume <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )}
        </div>
      </div>

      <DisclaimerBanner className="mb-6" />

      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">
              Learning progress
            </div>
            <h2 className="font-serif text-xl font-semibold">Modules completed</h2>
          </div>
          <div className="text-right">
            <div className="font-serif text-3xl font-semibold">{progressPercent}%</div>
            <div className="text-xs text-muted-foreground">
              {readModuleIds.size} of {MODULES.length}
            </div>
          </div>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </section>

      {progressPercent === 100 && (
        <Link
          to="/app/feedback-cpd"
          className="mb-6 flex min-w-0 items-center gap-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-5 transition-colors hover:border-brand-gold hover:bg-brand-gold/15"
        >
          <ClipboardCheck className="h-6 w-6 flex-shrink-0 text-brand-gold-ink" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-brand-gold-ink">Feedback &amp; CPD unlocked</div>
            <div className="mt-0.5 text-sm text-brand-gold-ink/80">
              Complete the short feedback form and CPD confirmation.
            </div>
          </div>
          <ChevronRight className="ml-auto h-5 w-5 flex-shrink-0 text-brand-gold-ink" />
        </Link>
      )}

      {/* Status strip */}
      <div className="mb-8 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Link to="/app/offline" className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-brand-green/40">
          {online ? <RefreshCw className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-brand-gold-ink" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold">{online ? "Online" : "Offline"}</div>
            <div className="truncate text-xs text-muted-foreground">
              Content v{contentVersion}{lastSync ? ` · synced ${new Date(lastSync).toLocaleDateString()}` : ""}
            </div>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/app/bookmarks" className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-brand-green/40">
          <Bookmark className="h-5 w-5 text-brand-green" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Bookmarks</div>
            <div className="truncate text-xs text-muted-foreground">
              {bookmarks.length > 0 ? `${bookmarks.length} saved items` : "Save key modules and toolkits"}
            </div>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Sparkles className="h-5 w-5 text-brand-gold-ink" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">What's new</div>
            <div className="truncate text-xs text-muted-foreground">
              {PRODUCT.moduleCount} modules · {PRODUCT.toolkitCount} toolkits available
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <SectionHeader title="Module categories" href="/app/modules" />
      <div className="mb-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((c) => {
          const count = MODULES.filter((m) => m.category === c.key).length;
          return (
            <Link
              key={c.key}
              to={`/app/modules?cat=${encodeURIComponent(c.key)}`}
              className={`group min-w-0 rounded-xl border bg-card p-5 transition-all hover:shadow-[0_8px_24px_-12px_rgba(47,65,54,0.4)] ${
                c.emergency ? "border-destructive/40" : "border-border hover:border-brand-green/40"
              }`}
            >
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-3 font-serif text-lg font-semibold">{c.label}</div>
              <div className="text-sm text-muted-foreground">{count} modules</div>
            </Link>
          );
        })}
      </div>

      {/* Rapid toolkits */}
      <SectionHeader title="Rapid-access toolkits" href="/app/toolkits" />
      <div className="mb-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickToolkits.map((t) => (
          <ToolkitCard key={t.id} toolkit={t} />
        ))}
      </div>

      {/* Recently viewed */}
      {recentItems.length > 0 && (
        <>
          <SectionHeader title="Recently viewed" href="/app/bookmarks" />
          <div className="mb-8 grid min-w-0 gap-3 xl:grid-cols-2">
            {recentItems.map((r) => {
              const mod = r.kind === "module" ? getModuleById(r.id) : null;
              const tk = r.kind === "toolkit" ? getToolkitById(r.id) : null;
              const title = mod?.title ?? tk?.title ?? "";
              const to = mod ? `/app/modules/${mod.slug}` : `/app/toolkits/${tk?.slug}`;
              const urgency = mod?.urgency ?? tk?.urgency;
              return (
                <Link key={r.id} to={to} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-brand-green/40">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground bg-muted">
                    {r.kind}
                  </span>
                  <span className="flex-1 truncate font-medium">{title}</span>
                  {urgency && <UrgencyBadge urgency={urgency} />}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Bookmarks */}
      {bookmarkedModules.length > 0 && (
        <>
          <SectionHeader title="Your bookmarks" href="/app/bookmarks" />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bookmarkedModules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-4">
      <h2 className="min-w-0 font-serif text-xl font-semibold">{title}</h2>
      <Link to={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-green hover:underline">
        View all <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
