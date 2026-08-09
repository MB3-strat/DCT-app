import { Siren, Search, Home, BookOpen, Wrench, Bookmark, User, Clock, AlertTriangle } from "lucide-react";

/**
 * A stylised preview of the real web application layout — a browser window
 * chrome, NOT a phone mockup. Illustrates the desktop clinical UI.
 */
export function AppPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-background shadow-2xl">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-gold/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <div className="ml-3 flex h-5 flex-1 items-center rounded bg-background px-2 text-[10px] text-muted-foreground">
          dctsurvivalkit.co.uk
        </div>
      </div>

      <div className="flex h-[360px] text-foreground">
        {/* sidebar */}
        <div className="hidden w-40 flex-col gap-1 bg-brand-green p-3 text-white/80 sm:flex">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-brand-gold/70">
              <img src="/dct-logo.png" alt="" className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-serif text-sm font-semibold text-white">DCT Survival Kit</div>
              <div className="text-[7px] uppercase tracking-[0.18em] text-white/55">Recognise. Assess.</div>
            </div>
          </div>
          {[
            { icon: Home, label: "Home", active: true },
            { icon: BookOpen, label: "Modules" },
            { icon: Wrench, label: "Toolkits" },
            { icon: Siren, label: "On-Call", emerg: true },
            { icon: Bookmark, label: "Bookmarks" },
            { icon: User, label: "Account" },
          ].map((i) => (
            <div
              key={i.label}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                i.active ? "bg-white/15 text-white" : ""
              } ${i.emerg ? "text-white" : ""}`}
            >
              <i.icon className="h-3.5 w-3.5" /> {i.label}
            </div>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 pb-3 pt-4">
            <div className="flex h-8 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-[10px] text-muted-foreground">
              <Search className="h-3 w-3" /> Search modules, toolkits, red flags…
            </div>
            <div className="emergency-gradient flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase text-white">
              <Siren className="h-3 w-3" /> On-Call
            </div>
          </div>

          <div className="p-4">
            <div className="hero-gradient rounded-xl p-4 text-white">
              <div className="grid gap-3 sm:grid-cols-[1fr_170px] sm:items-center">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60">Good evening, DCT</div>
                  <div className="mt-0.5 font-serif text-xl font-semibold">Ready when the bleep goes.</div>
                  <div className="mt-1 max-w-[230px] text-[11px] leading-snug text-white/72">
                    Recognise. Assess. Escalate. Jump straight to On-Call, or continue where you left off.
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/60">
                    <Clock className="h-3 w-3" /> Continue reading
                  </div>
                  <div className="mt-1 font-serif text-sm font-semibold">Welcome to OMFS</div>
                  <div className="mt-0.5 text-[10px] text-white/65">General Skills</div>
                  <div className="mt-2 text-[10px] font-semibold text-brand-gold">Resume →</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2 rounded-lg border border-brand-gold/35 bg-brand-gold/10 p-2 text-[10px] leading-snug text-brand-gold-ink">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <div><span className="font-bold">Educational aid only.</span> Always confirm doses and pathways against local guidance.</div>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-green">Learning progress</div>
                  <div className="font-serif text-sm font-semibold">Modules completed</div>
                </div>
                <div className="font-serif text-xl font-semibold">24%</div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-2 w-1/4 rounded-full bg-brand-green" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { t: "Online", u: "Synced today", c: "bg-success" },
                { t: "Bookmarks", u: "Saved modules", c: "bg-brand-green" },
                { t: "What's new", u: "36 modules", c: "bg-brand-gold" },
              ].map((card) => (
                <div key={card.t} className="rounded-lg border border-border bg-card p-2">
                  <div className="text-[10px] font-semibold leading-tight">{card.t}</div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${card.c}`} />
                    <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
                      {card.u}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
