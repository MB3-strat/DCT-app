import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Download, Info, Loader2, Lock, RefreshCw, Send, Star } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODULES } from "@/data/modules";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { readJSON, writeJSON } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STORAGE_KEY = "feedback-cpd";

const USEFULNESS = ["Extremely useful", "Very useful", "Useful", "Somewhat useful", "Not useful"];
const SECTIONS = [
  "Induction & getting started",
  "On-call survival",
  "Clerking & assessment",
  "Referrals & communication",
  "Documentation",
  "Handover",
  "Ward rounds",
  "Theatre survival",
  "Clinical modules",
  "Practical toolkits",
  "Other",
];
const CHANGE_OPTIONS = ["Significantly", "Yes, to some extent", "A little", "Not really", "Not at all"];
const RECOMMEND_OPTIONS = ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"];
const CONFIRMATIONS = [
  "I have worked through the DCT Survival Kit learning material.",
  "I have completed the feedback survey.",
  "I have engaged with the material sufficiently to regard this as 4 hours of CPD activity.",
  "I understand that I am responsible for retaining evidence of my CPD and ensuring it meets the requirements of my relevant professional regulator or organisation.",
];

interface FeedbackForm {
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
  fullName: string;
  registrationNumber: string;
  confirmations: string[];
  submitted: boolean;
  submittedAt?: string;
}

const EMPTY_FORM: FeedbackForm = {
  usefulness: "",
  sections: [],
  confidenceBefore: "",
  confidenceAfter: "",
  changedApproach: "",
  valuableLearning: "",
  missing: "",
  improvements: "",
  recommend: "",
  rating: 0,
  comments: "",
  fullName: "",
  registrationNumber: "",
  confirmations: [],
  submitted: false,
};

export default function FeedbackCpd() {
  const { user, getIdToken, refreshUser, confirmingCertificate, confirmCertificateAfterCheckout } = useAuth();
  const { read, syncReadProgress } = useLibrary();
  const readModuleIds = useMemo(() => new Set(read.filter((id) => id.startsWith("M"))), [read]);
  const allModulesRead = readModuleIds.size >= MODULES.length;
  const [form, setForm] = useState<FeedbackForm>(() => readJSON<FeedbackForm>(STORAGE_KEY, EMPTY_FORM));
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const certificatePaid = user?.certificatePurchased ?? false;

  // TEMPORARY testing shortcut — lets a tester skip clicking through every
  // module individually to reach the CPD certificate section. Writes real
  // "read" progress via the same syncReadProgress path a genuine read would
  // use, so the server-side module-completion check in
  // stripe-certificate-checkout.ts sees it too. Remove this once testing is
  // done — it lets anyone skip the reading requirement, which is fine for
  // testing but not something real users should have access to.
  async function markAllModulesReadForTesting() {
    setMarkingAllRead(true);
    try {
      await syncReadProgress(MODULES.map((m) => m.id));
      toast.success("All modules marked as read (testing only).");
    } catch {
      toast.error("Couldn't mark modules as read. Check your connection and try again.");
    } finally {
      setMarkingAllRead(false);
    }
  }

  useEffect(() => writeJSON(STORAGE_KEY, form), [form]);

  // This is a one-time payment (mode: "payment"), not a subscription — if
  // the user impatiently clicks "Pay €5" again before certificatePurchased
  // flips to true, that creates a *second real Stripe charge*, not just a
  // stale UI state. The actual confirmation poll (and the `confirming` flag)
  // lives in AuthContext, not here, specifically so it keeps running — and
  // keeps the button disabled — even if the user navigates away and back
  // before it resolves.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("certificate") === "success") {
      toast.success("Payment received — confirming your certificate...");
      confirmCertificateAfterCheckout();
    }
    if (params.get("certificate") === "cancelled") {
      toast.message("Certificate payment was cancelled.");
    }
    if (params.get("certificate") === "paid") {
      // Server-side found this was already paid via Stripe directly (not
      // our own KV, which can lag) and skipped creating a duplicate charge.
      // Kick the poll anyway in case our own status read just hasn't caught
      // up yet.
      toast.message("Certificate already paid — refreshing your status...");
      confirmCertificateAfterCheckout();
    }
    if (params.has("certificate")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Runs once on mount to handle the Stripe redirect query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Default "Full name for certificate" to the user's current profile name
  // (Account page fullName, falling back to their Auth display name) rather
  // than leaving it blank. Only fills it in while it's still empty, so this
  // never overwrites a value someone already typed or previously saved to
  // this form.
  useEffect(() => {
    if (user?.name && !form.fullName) {
      update("fullName", user.name);
    }
    // Only re-run when the profile name itself changes — not on every
    // form.fullName edit, or this would fight the user while they type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name]);

  function toggleList(key: "sections" | "confirmations", value: string) {
    setForm((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  }

  // The certificate-specific fields (name, registration number, CPD
  // confirmations) are only shown once all modules are read — see the CPD
  // FormSection below — so they're only required to save once they're
  // actually reachable. Someone who hasn't finished the modules yet can
  // still fill in and save the general feedback survey.
  const requiredComplete = Boolean(
    form.usefulness &&
      form.confidenceBefore &&
      form.confidenceAfter &&
      form.changedApproach &&
      form.recommend &&
      form.rating > 0 &&
      (!allModulesRead ||
        (form.fullName.trim() && form.registrationNumber.trim() && form.confirmations.length === CONFIRMATIONS.length)),
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!requiredComplete) return;
    setForm((prev) => ({ ...prev, submitted: true, submittedAt: new Date().toISOString() }));
  }

  async function openCertificateCheckout() {
    const idToken = await getIdToken();
    if (!idToken) {
      toast.error("Please sign in again before opening certificate checkout.");
      return;
    }

    setCertificateBusy(true);
    try {
      await syncReadProgress(Array.from(readModuleIds));

      const response = await fetch("/api/stripe-certificate-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        toast.error(payload.error || "Certificate checkout is not available yet.");
        return;
      }

      window.location.assign(payload.url);
    } finally {
      setCertificateBusy(false);
    }
  }

  async function downloadCertificate() {
    const idToken = await getIdToken();
    if (!idToken) {
      toast.error("Please sign in again before downloading the certificate.");
      return;
    }

    setDownloadBusy(true);
    try {
      const response = await fetch("/api/certificate-download", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          registrationNumber: form.registrationNumber.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast.error(payload.error || "Certificate is not available yet.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = "DCT Survival Kit Certificate.pdf";

      if (typeof document.createElement("a").download === "undefined") {
        // Browsers/webviews without download-attribute support (older embedded
        // webviews): fall back to opening the PDF so the user can save it manually.
        window.open(url, "_blank", "noopener");
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Safari reads the blob asynchronously after click(); revoking immediately
        // can invalidate the URL before the download actually starts.
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      toast.success("Certificate downloaded.");
    } catch {
      toast.error("Couldn't download the certificate. Check your connection and try again.");
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <PageContainer className="min-h-full max-w-4xl">
      <Link to="/app/modules" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Modules
      </Link>

      <div className="hero-gradient rounded-2xl p-6 text-white md:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Feedback & CPD
        </div>
        <h1 className="mt-2 font-serif text-3xl font-semibold">
          {allModulesRead ? "You've completed the DCT Survival Kit" : "Share your feedback"}
        </h1>
        <p className="mt-2 max-w-2xl text-white/80">
          Complete this short feedback form to record your reflection
          {allModulesRead ? " and CPD confirmation." : ". The CPD certificate unlocks once you've read every module."}
        </p>
      </div>

      <DisclaimerBanner className="mt-6" compact />

      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-brand-gold-ink">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="text-sm">
          <p>All fields in the survey below are required — the "Save feedback" button unlocks once everything is filled in.</p>
          <p className="mt-1">
            The CPD certificate section unlocks once you've read every module, and its €5 payment button unlocks
            once you've saved your feedback.
          </p>
        </div>
      </div>

      {form.submitted && (
        <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-5">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-success">
            <CheckCircle2 className="h-5 w-5" /> Feedback saved
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you. Your feedback has been saved on this device.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <FormSection title="Feedback survey">
          <RadioField label="1. How useful did you find the DCT Survival Kit?" options={USEFULNESS} value={form.usefulness} onChange={(value) => update("usefulness", value)} />

          <CheckboxField
            label="2. Which sections did you find most useful?"
            options={SECTIONS}
            value={form.sections}
            onToggle={(value) => toggleList("sections", value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <RadioField label="3a. Confidence before using the Survival Kit" options={["1", "2", "3", "4", "5"]} value={form.confidenceBefore} onChange={(value) => update("confidenceBefore", value)} horizontal />
            <RadioField label="3b. Confidence after using the Survival Kit" options={["1", "2", "3", "4", "5"]} value={form.confidenceAfter} onChange={(value) => update("confidenceAfter", value)} horizontal />
          </div>

          <RadioField label="4. Has the Survival Kit changed your approach to DCT work?" options={CHANGE_OPTIONS} value={form.changedApproach} onChange={(value) => update("changedApproach", value)} />

          <TextareaField label="5. What was the most valuable thing you learned?" value={form.valuableLearning} onChange={(value) => update("valuableLearning", value)} />
          <TextareaField label="6. Was anything missing?" value={form.missing} onChange={(value) => update("missing", value)} />
          <TextareaField label="7. What should we add or improve?" value={form.improvements} onChange={(value) => update("improvements", value)} />

          <RadioField label="8. Would you recommend the DCT Survival Kit to another DCT?" options={RECOMMEND_OPTIONS} value={form.recommend} onChange={(value) => update("recommend", value)} />

          <div>
            <label className="text-sm font-semibold">9. Overall rating</label>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => update("rating", rating)}
                  aria-label={`${rating} star rating`}
                  className={cn(
                    "rounded-lg border p-2 transition-colors",
                    form.rating >= rating ? "border-brand-gold bg-brand-gold/20 text-brand-gold-ink" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Star className={cn("h-5 w-5", form.rating >= rating && "fill-current")} />
                </button>
              ))}
            </div>
          </div>

          <TextareaField label="10. Additional comments" value={form.comments} onChange={(value) => update("comments", value)} />
        </FormSection>

        <FormSection title="4-hour CPD certificate details">
          {!allModulesRead ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
              <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">Complete all modules to unlock the CPD certificate</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                You can still fill in and save the feedback survey above — come back to this section once you've
                read every module.
              </p>
              <div className="mx-auto mt-4 max-w-xs">
                <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  {readModuleIds.size} of {MODULES.length} modules complete
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-brand-green"
                    style={{ width: `${Math.round((readModuleIds.size / MODULES.length) * 100)}%` }}
                  />
                </div>
              </div>
              <Link
                to="/app/modules"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:underline"
              >
                Go to modules <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <div className="mx-auto mt-6 max-w-sm rounded-xl border border-dashed border-brand-gold/50 bg-brand-gold/10 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-ink">Testing only</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Skip clicking through every module to test the CPD certificate purchase flow.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={markAllModulesReadForTesting}
                  disabled={markingAllRead}
                  className="mt-3 w-full"
                >
                  {markingAllRead ? "Marking all as read..." : "Mark all modules as read"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                The DCT Survival Kit is designed to support 4 hours of structured/self-directed continuing professional development.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold" htmlFor="fullName">Full name for certificate</label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor="registrationNumber">GDC/GMC number</label>
                  <Input id="registrationNumber" value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} className="mt-2" />
                </div>
              </div>

              <CheckboxField
                label="Before requesting a certificate, confirm:"
                options={CONFIRMATIONS}
                value={form.confirmations}
                onToggle={(value) => toggleList("confirmations", value)}
              />

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-semibold">CPD certificate</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Unlock the certificate after all modules are complete and the €5 Stripe payment is confirmed.
                    </p>
                    {certificatePaid && user?.certificatePaidAt && (
                      <p className="mt-1 text-xs font-semibold text-success">Paid on {user.certificatePaidAt}</p>
                    )}
                  </div>

                  {certificatePaid ? (
                    <Button type="button" onClick={downloadCertificate} disabled={downloadBusy} className="gap-2 rounded-full">
                      <Download className="h-4 w-4" /> {downloadBusy ? "Preparing..." : "Download certificate"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={openCertificateCheckout}
                      disabled={!form.submitted || certificateBusy || confirmingCertificate}
                      className="gap-2 rounded-full"
                    >
                      <CreditCard className="h-4 w-4" />
                      {confirmingCertificate ? "Confirming payment..." : certificateBusy ? "Opening..." : "Pay €5"}
                    </Button>
                  )}
                </div>

                {confirmingCertificate && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-brand-green/40 bg-brand-green/10 px-3 py-2 text-brand-green">
                    <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" />
                    <p className="text-xs">
                      Confirming your payment with Stripe — this is usually quick, but can occasionally take up to a
                      minute. The button stays disabled until this finishes, so you won't be charged twice.
                    </p>
                  </div>
                )}
                {!form.submitted && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Save the feedback form first, then the certificate payment button will unlock.
                  </p>
                )}
                {!certificatePaid && form.submitted && !confirmingCertificate && (
                  <button
                    type="button"
                    onClick={() => refreshUser()}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh payment status after checkout
                  </button>
                )}
              </div>
            </>
          )}
        </FormSection>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!requiredComplete} className="gap-2">
            <Send className="h-4 w-4" /> Save feedback
          </Button>
          {!requiredComplete && (
            <p className="text-sm text-muted-foreground">
              {allModulesRead
                ? "Complete the required rating, recommendation, certificate details and CPD confirmations to save."
                : "Complete the required rating and recommendation above to save your feedback."}
            </p>
          )}
        </div>
      </form>
    </PageContainer>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-serif text-xl font-semibold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function RadioField({
  label, options, value, onChange, horizontal,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  horizontal?: boolean;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{label}</div>
      <div className={cn("mt-2 grid gap-2", horizontal ? "grid-cols-5" : "sm:grid-cols-2")}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
              value === option ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-border bg-background hover:bg-muted",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxField({
  label, options, value, onToggle,
}: {
  label: string;
  options: string[];
  value: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm leading-relaxed">
            <Checkbox checked={value.includes(option)} onCheckedChange={() => onToggle(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-[110px]" />
    </div>
  );
}
