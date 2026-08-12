import { PublicLayout } from "@/components/public/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Who is the DCT Survival Kit for?",
    a: "OMFS Dental Core Trainees, Trust-grade clinicians, Fellows, and any junior doctor rotating through OMFS. It's a personal survival resource for your first on-call shifts — not an institutional tool.",
  },
  {
    q: "Is this a substitute for senior advice or local policy?",
    a: "No. It is an educational aid only. It does not replace senior clinical advice, local trust policies, professional judgment, or emergency escalation procedures. Always confirm doses and pathways against local guidance.",
  },
  {
    q: "Who writes the clinical content?",
    a: "It is authored by a practising consultant OMF surgeon, drawing on personal practice, local protocols and named guideline bodies (Resuscitation Council UK, BNF, NICE, ATLS, BAOMS).",
  },
  {
    q: "How often is content reviewed?",
    a: "The target review cadence is biannual, or sooner where emergent national guidance supersedes existing material. Each module shows its version and review status.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. After the first successful sync, core emergency content is designed to remain available offline, which matters when hospital signal is poor.",
  },
  {
    q: "How much does it cost?",
    a: "€20 per year (roughly €1.67 per month). One subscription unlocks every module and toolkit, offline support, and content updates for the year. The optional CPD certificate is a separate €5 one-time payment after completing all modules and the feedback form.",
  },
  {
    q: "What happens to my access if I don't renew?",
    a: "Access is for the paid year. When the year ends, access expires. (Final terms require approval before launch.)",
  },
  {
    q: "How is my data handled?",
    a: "The first version collects as little personal data as possible. Bookmarks and progress can sync to your account. There is no patient-data collection, no clinical-image uploads, and no advertising trackers.",
  },
  {
    q: "How do I report a clinical error?",
    a: "There's a dedicated 'Report a clinical-content issue' flow inside the app. Safety-critical corrections are prioritised for review by the clinical author.",
  },
];

export default function Faq() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6">
        <div className="kicker">FAQ</div>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Frequently asked questions</h1>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-serif text-lg">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PublicLayout>
  );
}
