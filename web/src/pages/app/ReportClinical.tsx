import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileWarning, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULES } from "@/data/modules";
import { TOOLKITS } from "@/data/toolkits";
import { PRODUCT } from "@/data/meta";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

const CATEGORIES = [
  "Incorrect dose or threshold",
  "Out-of-date guidance",
  "Missing step or content",
  "Duplicated content",
  "Unclear wording",
  "Broken link / reference",
  "Other",
];

export default function ReportClinical() {
  const { user } = useAuth();
  const location = useLocation();
  const preset = (location.state as { contentId?: string; title?: string } | null) ?? null;
  const [contentId, setContentId] = useState(preset?.contentId ?? "");
  const [section, setSection] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [contactOk, setContactOk] = useState(false);
  const [done, setDone] = useState(false);

  const options = [
    ...MODULES.map((m) => ({ id: m.id, label: `${m.id} · ${m.title}` })),
    ...TOOLKITS.map((t) => ({ id: t.id, label: `${t.id} · ${t.title}` })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) {
      toast.error("Please sign in again before submitting a report.");
      return;
    }

    try {
      await addDoc(collection(db, "reportedIssues"), {
        userId: user.id,
        issueType: "clinical",
        contentId,
        title: `${category}${section ? ` · ${section}` : ""}`,
        description,
        url: window.location.href,
        contactOk,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDone(true);
      toast.success("Clinical issue submitted for review.");
    } catch {
      toast.error("Unable to submit report.");
    }
  }

  if (done) {
    return (
      <PageContainer className="max-w-xl">
        <div className="rounded-2xl border border-success/30 bg-success/[0.05] p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
          <h1 className="font-serif text-2xl font-semibold">Thank you</h1>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Your report has been logged for clinical review. Safety-critical
            corrections are prioritised by the clinical author.
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
      <PageHeading
        kicker="Report an issue"
        title="Clinical-content issue"
        description="Flag a possible error in the clinical guidance so it can be reviewed by the clinical author."
      />

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/[0.05] px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
        <span>
          <strong>Do not include patient-identifiable information</strong> —
          no names, NHS numbers, dates of birth, clinical photographs, or records.
        </span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Module or toolkit">
          <select value={contentId} onChange={(e) => setContentId(e.target.value)} required className="input">
            <option value="">Select content…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Section (optional)">
          <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Red Flags, Management Algorithm" className="input" />
        </Field>
        <Field label="Content version">
          <input value={`v1.0 · content ${PRODUCT.contentVersion}`} readOnly className="input bg-muted text-muted-foreground" />
        </Field>
        <Field label="Issue category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} placeholder="Describe the issue and, if possible, the correct guidance and its source." className="input" />
        </Field>
        <label className="flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <Checkbox
            checked={contactOk}
            onCheckedChange={(checked) => setContactOk(checked === true)}
            className="mt-0.5"
          />
          I'm happy to be contacted about this report if clarification is needed.
        </label>
        <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 font-semibold text-white hover:bg-brand-green-mid">
          <Send className="h-4 w-4" /> Submit for review
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
