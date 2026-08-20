import { PublicLayout } from "@/components/public/PublicLayout";

const CONTENT: Record<
  string,
  { title: string; intro?: string; sections: { h: string; p: string }[] }
> = {
  terms: {
    title: "Terms of Use",
    sections: [
      { h: "1. The service", p: "The DCT Survival Kit is a personal educational reference and induction resource for clinicians. It is provided on an annual subscription basis to individual users." },
      { h: "2. Not medical advice", p: "The content is an educational aid. It is not a substitute for senior clinical advice, local trust policies, professional judgment, or emergency escalation procedures. You remain responsible for confirming all doses, thresholds and pathways against local guidance." },
      { h: "3. Subscription & access", p: "Access is granted for the paid year and expires at the end of that period. Refund and cancellation terms will be specified here following review." },
      { h: "4. Acceptable use", p: "You agree not to enter patient-identifiable information into the app and to use it only as an individual professional reference." },
      { h: "5. Liability", p: "Liability limitations and the clinical-guidance disclaimer language will be finalised with counsel prior to launch." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "This app's first version is designed to collect as little personal data as possible.",
    sections: [
      { h: "Data we collect", p: "Account basics (name, email) for authentication. Bookmarks and reading progress are stored only to provide the app experience." },
      { h: "What we do NOT collect", p: "No patient data, no clinical-image uploads, no advertising trackers, no session-recording software, and no marketing pixels." },
      { h: "Storage & sync", p: "Bookmarks and progress can sync to your account so they survive device changes." },
      { h: "Your rights", p: "Under UK GDPR / DPA 2018 you have rights over your personal data. The process for exercising them will be documented here." },
      { h: "Payments", p: "Payment processing (Stripe) handles card data directly; card details are not stored by this app." },
    ],
  },
  disclaimer: {
    title: "Clinical Disclaimer",
    sections: [
      { h: "Educational aid only", p: "This product is a personal educational and revision aid for clinicians rotating through OMFS. It is not an institutionally endorsed clinical safety tool and is not a medical device." },
      { h: "Always escalate", p: "For any patient in front of you, senior clinical advice and local escalation pathways take precedence over anything shown here. If you are worried about a patient, escalate early." },
      { h: "Doses & thresholds", p: "Where doses or thresholds are shown (e.g. adrenaline, tranexamic acid, Sepsis 6), they reflect named guideline sources at the time of writing. Always confirm against the BNF and your local trust policy before acting." },
      { h: "Local overrides", p: "Always confirm any pathway, dose, threshold or contact route against your employing organisation's current policy." },
    ],
  },
};

export default function Legal({ kind }: { kind: "terms" | "privacy" | "disclaimer" }) {
  const c = CONTENT[kind];
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6">
        <h1 className="font-serif text-4xl font-semibold">{c.title}</h1>
        {c.intro && (
          <div className="mt-4 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm text-brand-gold-ink">
            {c.intro}
          </div>
        )}
        <div className="mt-8 space-y-7">
          {c.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-serif text-xl font-semibold">{s.h}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">Last updated: placeholder date.</p>
      </div>
    </PublicLayout>
  );
}
