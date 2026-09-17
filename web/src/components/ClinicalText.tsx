import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { ToolkitTable } from "@/data/types";

/**
 * Renders a single clinical item verbatim.
 * The uploaded content uses a leading "Heading\n..." convention and inline
 * "Label: value" fragments plus checklist markers (□). We format for
 * readability WITHOUT altering the clinical wording.
 */
export function ClinicalItem({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // First line acts as an inline sub-heading when short and not a checklist line.
  const [first, ...rest] = lines;
  const firstIsHeading =
    rest.length > 0 && first.length < 60 && !first.startsWith("□") && !/[.:]$/.test(first) && !first.includes(": ");

  const body = firstIsHeading ? rest : lines;

  return (
    <div className="mb-3 last:mb-0">
      {firstIsHeading && (
        <p className="mb-1 font-semibold text-foreground">{first}</p>
      )}
      {body.map((line, i) => {
        const hasCheck = line.includes("□");
        return (
          hasCheck ? (
            <ChecklistText key={i} line={line} />
          ) : (
            <p key={i} className="text-[15px] leading-relaxed text-foreground/85">
              {line}
            </p>
          )
        );
      })}
    </div>
  );
}

/**
 * Renders a reference/comparison table verbatim (e.g. "arterial vs venous
 * flap signs", "finding vs what to think about"). Styling mirrors the
 * admin data tables elsewhere in the app (AdminUsersTab) for consistency.
 */
export function ClinicalTable({ table }: { table: ToolkitTable }) {
  return (
    <div className="mb-4 last:mb-0">
      {table.label && (
        <p className="mb-2 font-semibold text-foreground">{table.label}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {table.headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 align-top leading-relaxed text-foreground/85">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChecklistText({ line }: { line: string }) {
  const [intro, ...rawItems] = line.split("□");
  const items = rawItems
    .map((item) => item.trim().replace(/^,/, "").replace(/,$/, "").trim())
    .filter(Boolean);

  return (
    <div className="my-2 space-y-2">
      {intro.trim() && (
        <p className="text-[15px] leading-relaxed text-foreground/85">
          {intro.trim()}
        </p>
      )}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex gap-3 rounded-lg border border-border/80 bg-background/55 px-3 py-2.5 text-[15px] leading-relaxed text-foreground/85 shadow-sm"
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                "border-brand-green/35 bg-brand-green/5 text-brand-green",
              )}
              aria-hidden
            >
              <Check className="h-3.5 w-3.5 opacity-45" />
            </span>
            <span className="min-w-0">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
