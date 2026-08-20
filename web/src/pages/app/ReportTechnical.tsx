import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

const CATEGORIES = [
  "App crash or freeze",
  "Content not loading",
  "Search not working",
  "Offline / sync problem",
  "Login / account problem",
  "Layout / display problem",
  "Other",
];

export default function ReportTechnical() {
  const { user } = useAuth();
  const [page, setPage] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);

  const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const errorId = "ERR-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) {
      toast.error("Please sign in again before submitting a report.");
      return;
    }

    try {
      await addDoc(collection(db, "reportedIssues"), {
        userId: user.id,
        issueType: "technical",
        title: `${category} · ${page || "Unspecified page"} · ${errorId}`,
        description: `${description}\n\nDevice/browser: ${deviceInfo}`,
        url: window.location.href,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDone(true);
      toast.success("Technical issue submitted.");
    } catch {
      toast.error("Unable to submit report.");
    }
  }

  if (done) {
    return (
      <PageContainer className="max-w-xl">
        <div className="rounded-2xl border border-success/30 bg-success/[0.05] p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
          <h1 className="font-serif text-2xl font-semibold">Report received</h1>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Thanks — your technical report has been logged with reference{" "}
            <span className="font-mono font-semibold">{errorId}</span>.
          </p>
          <Link to="/app" className="mt-6 inline-block rounded-full bg-brand-green px-6 py-2.5 font-semibold text-white hover:bg-brand-green-mid">
            Back to home
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-xl">
      <Link to="/app/account" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Account
      </Link>
      <PageHeading kicker="Report an issue" title="Technical issue" description="Report a bug or problem with the app itself (not clinical content)." />

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold-ink">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <span>Do not include patient-identifiable information in your description.</span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Which page?">
          <input value={page} onChange={(e) => setPage(e.target.value)} placeholder="e.g. On-Call mode, a module page" className="input" />
        </Field>
        <Field label="Issue type">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} placeholder="What happened, and what did you expect?" className="input" />
        </Field>
        <Field label="Device / browser (auto-detected)">
          <textarea value={deviceInfo} readOnly rows={2} className="input bg-muted text-xs text-muted-foreground" />
        </Field>
        <Field label="Error reference">
          <input value={errorId} readOnly className="input bg-muted font-mono text-muted-foreground" />
        </Field>
        <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 font-semibold text-white hover:bg-brand-green-mid">
          <Send className="h-4 w-4" /> Submit report
        </button>
      </form>
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
