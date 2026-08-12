import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { PRODUCT } from "@/data/meta";

const INCLUDED = [
  "All 36 handbook modules",
  "All 18 clinical toolkits",
  "One-tap On-Call emergency mode",
  "Fast prioritised search",
  "Bookmarks, progress & recently viewed",
  "Offline-ready access",
  "Content updates included for the year",
];

const NOT_INCLUDED = [
  "No institutional / trust licensing (individual use only)",
  "No generative AI clinical advice",
  "No patient-data storage or image uploads",
];

export default function Pricing() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:px-6">
        <div className="kicker">Pricing</div>
        <h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">
          One plan. Everything included.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          The {PRODUCT.name} is sold to individuals — a personal survival
          resource, not an institutional product.
        </p>

        <div className="mx-auto mt-10 max-w-md overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm">
          <div className="hero-gradient p-8 text-center text-white">
            <div className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Annual subscription
            </div>
            <div className="mt-2 font-serif text-5xl font-semibold">€20</div>
            <div className="mt-1 text-white/70">per year · €1.67 / month equivalent</div>
          </div>
          <div className="p-8">
            <ul className="space-y-3">
              {INCLUDED.map((i) => (
                <li key={i} className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3.5 font-bold text-white transition-transform hover:scale-[1.02]"
            >
              Get the kit <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Payment is handled through Stripe Checkout. App access is only
              unlocked after Stripe confirms the subscription.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-md rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-5 text-left">
          <h3 className="text-sm font-semibold text-brand-gold-ink">Optional CPD certificate</h3>
          <p className="mt-2 text-sm text-brand-gold-ink/80">
            After completing all modules and the feedback form, users can unlock the CPD certificate with a separate €5 one-time Stripe payment.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-border bg-background p-5 text-left">
          <h3 className="text-sm font-semibold">Good to know</h3>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {NOT_INCLUDED.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-8 max-w-lg text-xs text-muted-foreground">
          Pricing, refund and cancellation terms require final approval before
          launch. Access expires at the end of each paid year.
        </p>
      </div>
    </PublicLayout>
  );
}
