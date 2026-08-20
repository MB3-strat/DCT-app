import {
  Globe,
  ExternalLink,
  Stethoscope,
  HeartPulse,
  ShieldCheck,
  Smile,
  Scale,
  GraduationCap,
  Info,
  type LucideIcon,
} from "lucide-react";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import {
  EXTERNAL_RESOURCES,
  EXTERNAL_RESOURCES_DISCLAIMER,
} from "@/data/externalResources";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "On-Call Essentials": Stethoscope,
  "Emergencies & Resuscitation": HeartPulse,
  "Surgery, Safety & Patient Care": ShieldCheck,
  "Dental / Oral Medicine & Specialty Resources": Smile,
  "Professional, Ethical & Governance": Scale,
  "Training & Education": GraduationCap,
};

export default function ExternalResources() {
  return (
    <PageContainer className="max-w-3xl">
      <PageHeading
        kicker="Quick access"
        title="External resources"
        description="Quick-access links to authoritative, current guidance for Dental Core Trainees in Oral & Maxillofacial Surgery."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-brand-gold-ink">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <p className="text-[13px] leading-snug">
          Use these links as a quick route to authoritative, current
          guidance. External guidance can change; always check the live
          source and follow your Trust&apos;s local policies, protocols and
          escalation arrangements.
        </p>
      </div>

      <div className="space-y-6">
        {EXTERNAL_RESOURCES.map((group) => {
          const Icon = CATEGORY_ICONS[group.category] ?? Globe;
          return (
            <section key={group.category} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
                <Icon className="h-5 w-5 text-brand-green" aria-hidden /> {group.category}
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-brand-green/40 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5 text-[14px] font-semibold text-foreground">
                        <span className="min-w-0 break-words">{link.title}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        {EXTERNAL_RESOURCES_DISCLAIMER}
      </p>
    </PageContainer>
  );
}
