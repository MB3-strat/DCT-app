import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Persistent educational-use disclaimer.
 */
export function DisclaimerBanner({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3.5 py-2.5 text-brand-gold-ink",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      <p className={cn("text-[13px] leading-snug", compact && "text-xs")}>
        <strong>Educational aid only.</strong> This is a personal reference and
        survival resource. It does not replace senior clinical advice, local
        trust policies, professional judgment, or emergency escalation
        procedures. Always confirm doses and pathways against local guidance.
      </p>
    </div>
  );
}
