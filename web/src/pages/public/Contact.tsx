import { useState } from "react";
import { Mail, LifeBuoy, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/public/PublicLayout";

export default function Contact() {
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    toast.message("This form isn't connected to an inbox yet — nothing was sent. A support address will be published before launch.");
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-16 md:px-6">
        <div className="kicker">Contact &amp; support</div>
        <h1 className="mt-2 font-serif text-4xl font-semibold">We'd like to hear from you</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          For bugs, subscription help, or clinical-content queries. Clinical
          errors are prioritised for review by the clinical author.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">Name</label>
              <input id="c-name" required className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium">Email</label>
              <input id="c-email" type="email" required className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label htmlFor="c-topic" className="mb-1.5 block text-sm font-medium">Topic</label>
              <select id="c-topic" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option>General question</option>
                <option>Subscription / billing</option>
                <option>Technical issue</option>
                <option>Clinical-content query</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-msg" className="mb-1.5 block text-sm font-medium">Message</label>
              <textarea id="c-msg" required rows={5} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-3 text-xs text-brand-gold-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Do not include patient names, NHS numbers, dates of birth, clinical
              photographs, records, or any patient-identifiable information.
            </div>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 font-semibold text-white hover:bg-brand-green-mid">
              <Send className="h-4 w-4" /> {sent ? "Not sent — see note above" : "Send message"}
            </button>
          </form>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-5">
              <Mail className="mb-2 h-5 w-5 text-brand-green" />
              <h3 className="font-semibold">Email support</h3>
              <p className="text-sm text-muted-foreground">
                A support address will be published before launch.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5">
              <LifeBuoy className="mb-2 h-5 w-5 text-brand-green" />
              <h3 className="font-semibold">Urgent clinical queries</h3>
              <p className="text-sm text-muted-foreground">
                For a patient in front of you, always contact your on-call
                registrar or consultant — not this form.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
