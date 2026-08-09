import { MODULES } from "@/data/modules";
import { TOOLKITS } from "@/data/toolkits";
import type { Urgency } from "@/data/types";

export interface SearchResult {
  id: string;
  slug: string;
  kind: "module" | "toolkit";
  title: string;
  category: string;
  urgency: Urgency;
  matched: string;
  score: number;
}

const URGENCY_RANK: Record<Urgency, number> = {
  Emergency: 3,
  Urgent: 2,
  Routine: 1,
  Foundation: 0,
};

function snippet(text: string, q: string): string | null {
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return null;
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + q.length + 60);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

/**
 * Search across module titles/sections/tags and toolkit titles/steps.
 * Title matches and higher-urgency content are prioritised.
 */
export function search(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const results: SearchResult[] = [];

  for (const m of MODULES) {
    let score = 0;
    let matched = "";
    if (m.title.toLowerCase().includes(q)) {
      score += 100;
      matched = m.title;
    }
    if (m.tags.some((t) => t.toLowerCase().includes(q))) {
      score += 30;
      matched = matched || "Tag: " + m.tags.find((t) => t.toLowerCase().includes(q));
    }
    if (!matched || score < 100) {
      for (const s of m.sections) {
        const inHeading = snippet(s.heading, q);
        if (inHeading) {
          score += 20;
          matched = matched || inHeading;
          break;
        }
        for (const item of s.items) {
          const sn = snippet(item, q);
          if (sn) {
            score += 10;
            matched = matched || sn;
            break;
          }
        }
        if (matched) break;
      }
    }
    if (score > 0) {
      results.push({
        id: m.id,
        slug: m.slug,
        kind: "module",
        title: m.title,
        category: m.category,
        urgency: m.urgency,
        matched: matched || m.quote,
        score: score + URGENCY_RANK[m.urgency] * 2,
      });
    }
  }

  for (const t of TOOLKITS) {
    let score = 0;
    let matched = "";
    if (t.title.toLowerCase().includes(q)) {
      score += 100;
      matched = t.title;
    }
    if (t.introduction.toLowerCase().includes(q)) {
      score += 15;
      matched = matched || t.introduction;
    }
    const steps = [
      ...(t.steps ?? []),
      ...(t.items ?? []),
      ...((t.links ?? []).map((link) => `${link.label} ${link.url}`)),
    ];
    for (const st of steps) {
      const sn = snippet(st, q);
      if (sn) {
        score += 10;
        matched = matched || sn;
        break;
      }
    }
    if (score > 0) {
      results.push({
        id: t.id,
        slug: t.slug,
        kind: "toolkit",
        title: t.title,
        category: t.category,
        urgency: t.urgency,
        matched: matched || t.introduction,
        score: score + URGENCY_RANK[t.urgency] * 2,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
