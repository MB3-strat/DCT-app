import { createClient } from "@supabase/supabase-js";
import modules from "../src/data/modules.json" assert { type: "json" };
import { TOOLKITS } from "../src/data/toolkits";
import type { Module } from "../src/data/types";

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL or VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const moduleRows = (modules as Module[]).map((module, index) => ({
    id: module.id,
    slug: module.slug,
    title: module.title,
    category: module.category,
    urgency: module.urgency,
    tags: module.tags,
    quote: module.quote,
    sections: module.sections,
    version: module.version,
    clinical_owner: module.clinicalOwner,
    last_reviewed: module.lastReviewed,
    next_review: module.nextReview,
    status: module.status,
    source: { imported_from: "web/src/data/modules.json" },
    sort_order: index + 1,
  }));

  const toolkitRows = TOOLKITS.map((toolkit, index) => ({
    id: toolkit.id,
    slug: toolkit.slug,
    title: toolkit.title,
    category: toolkit.category,
    type: toolkit.type,
    urgency: toolkit.urgency,
    icon: toolkit.icon,
    introduction: toolkit.introduction,
    steps: toolkit.steps,
    items: toolkit.items,
    warnings: toolkit.warnings,
    escalation: toolkit.escalation,
    related_modules: toolkit.relatedModules,
    sources: toolkit.sources,
    version: toolkit.version,
    clinical_owner: toolkit.clinicalOwner,
    last_reviewed: toolkit.lastReviewed,
    next_review: toolkit.nextReview,
    status: toolkit.status,
    placeholder: Boolean(toolkit.placeholder),
    source: { imported_from: "web/src/data/toolkits.ts" },
    sort_order: index + 1,
  }));

  const { error: moduleError } = await supabase.from("modules").upsert(moduleRows);
  if (moduleError) throw moduleError;

  const { error: toolkitError } = await supabase.from("toolkits").upsert(toolkitRows);
  if (toolkitError) throw toolkitError;

  console.log(`Seeded ${moduleRows.length} modules and ${toolkitRows.length} toolkits.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
