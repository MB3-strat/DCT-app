import { ShieldAlert, PhoneCall, Pill, Building2, AlertTriangle } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { PRODUCT } from "@/data/meta";

export default function Disclaimer() {
  return (
    <PageContainer className="max-w-3xl">
      <PageHeading kicker="Please read" title="Disclaimer & intended use" />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-5">
        <ShieldAlert className="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
        <div>
          <h2 className="font-serif text-lg font-semibold text-destructive">Educational aid only</h2>
          <p className="mt-1 text-[15px] leading-relaxed">
            The {PRODUCT.name} is a personal reference and survival resource for
            clinicians rotating through OMFS. It is <strong>not</strong> a
            substitute for senior clinical advice, local trust policies,
            professional judgment, or emergency escalation procedures. It is not
            an institutionally endorsed clinical safety tool and is not a medical
            device.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Block icon={PhoneCall} title="Always escalate">
          For any patient in front of you, senior clinical advice and local
          escalation pathways take precedence over anything shown here. If you
          are worried about a patient, escalate early — that is good judgement,
          not weakness.
        </Block>
        <Block icon={Pill} title="Doses & thresholds">
          Where doses or thresholds are shown (for example adrenaline, tranexamic
          acid, or the Sepsis 6 bundle), they reflect named guideline sources
          (Resuscitation Council UK, BNF, NICE, ATLS, BAOMS) at the time of
          writing. Always confirm against the BNF and your local trust policy
          before acting.
        </Block>
        <Block icon={Building2} title="Local overrides">
          Always confirm local pathways, contacts, doses and thresholds with
          your employing organisation. Every trust has its own guidance.
        </Block>
        <Block icon={AlertTriangle} title="No patient data">
          Do not enter patient names, NHS numbers, dates of birth, clinical
          photographs, records, or any other patient-identifiable information
          anywhere in this app.
        </Block>
      </div>
    </PageContainer>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof PhoneCall; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold">
        <Icon className="h-5 w-5 text-brand-green" /> {title}
      </h2>
      <p className="text-[15px] leading-relaxed text-foreground/85">{children}</p>
    </section>
  );
}
