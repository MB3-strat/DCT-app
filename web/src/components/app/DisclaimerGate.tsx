import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PRODUCT } from "@/data/meta";

export function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl md:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold-ink">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">
          Read before using {PRODUCT.name}
        </div>
        <h1 className="mt-2 font-serif text-3xl font-semibold">Clinical disclaimer</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          This app is an educational aid for clinicians rotating through OMFS. It is not
          a substitute for senior clinical advice, local trust policy, professional
          judgement, or emergency escalation procedures.
        </p>
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
            <div className="space-y-2 text-sm leading-relaxed">
              <p>Always escalate early if you are worried about a patient.</p>
              <p>Always confirm doses, thresholds, pathways and local contacts against current local guidance.</p>
              <p>Do not enter patient-identifiable information anywhere in this app.</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onAccept}
          className="mt-6 w-full rounded-full bg-brand-green px-6 py-3 font-semibold text-white hover:bg-brand-green-mid"
        >
          I understand and accept
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          You will see this reminder each time you start a new app session.
        </p>
      </section>
    </div>
  );
}
