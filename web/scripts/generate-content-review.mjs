#!/usr/bin/env npx tsx
/**
 * Generates a static, dependency-free "content review" click-through of
 * every module and toolkit — no login, no Stripe, no Firebase. It reads
 * directly from the real src/data/modules.json and src/data/toolkits.ts,
 * so it's always in sync with whatever content is currently in the repo.
 *
 * Purpose: a shareable, git-tracked site for clinical content review (e.g.
 * with Dr Bhatt) that mirrors the live app's structure and styling without
 * needing any deployment/auth setup. Re-run after any content change:
 *
 *   npm run content-review
 *
 * Output goes to content-review/ at the repo root and is committed to git
 * (not gitignored) so it's browsable straight from the repo, and so a diff
 * of content-review/ after a content change shows reviewers exactly what
 * moved. Re-run the script and commit the result whenever modules.json or
 * toolkits.ts changes.
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { MODULES } from "../src/data/modules.ts";
import { TOOLKITS } from "../src/data/toolkits.ts";
import { CATEGORIES, URGENCY_META, PRODUCT } from "../src/data/meta.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../content-review");

// ---------------------------------------------------------------- helpers --

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mirrors ClinicalText.tsx's ClinicalItem component exactly. */
function renderClinicalItem(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  const [first, ...rest] = lines;
  const firstIsHeading =
    rest.length > 0 && first.length < 60 && !first.startsWith("□") && !/[.:]$/.test(first) && !first.includes(": ");
  const body = firstIsHeading ? rest : lines;

  let html = `<div class="citem">`;
  if (firstIsHeading) html += `<p class="citem-head">${esc(first)}</p>`;
  for (const line of body) {
    html += line.includes("□") ? renderChecklistText(line) : `<p class="citem-line">${esc(line)}</p>`;
  }
  html += `</div>`;
  return html;
}

/** Mirrors ClinicalText.tsx's ChecklistText component exactly. */
function renderChecklistText(line) {
  const [intro, ...rawItems] = line.split("□");
  const items = rawItems.map((i) => i.trim().replace(/^,/, "").replace(/,$/, "").trim()).filter(Boolean);
  let html = `<div class="cchecklist">`;
  if (intro.trim()) html += `<p class="citem-line">${esc(intro.trim())}</p>`;
  html += `<div class="cchecklist-items">`;
  for (const item of items) {
    html += `<div class="cchecklist-item"><span class="cchecklist-box" aria-hidden="true">✓</span><span>${esc(item)}</span></div>`;
  }
  html += `</div></div>`;
  return html;
}

/** Mirrors ClinicalText.tsx's new ClinicalTable component. */
function renderTable(table) {
  let html = `<div class="ctable-block">`;
  if (table.label) html += `<p class="ctable-label">${esc(table.label)}</p>`;
  html += `<div class="ctable-scroll"><table><thead><tr>`;
  for (const h of table.headers) html += `<th>${esc(h)}</th>`;
  html += `</tr></thead><tbody>`;
  for (const row of table.rows) {
    html += `<tr>`;
    for (const cell of row) html += `<td>${esc(cell)}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table></div></div>`;
  return html;
}

function urgencyBadge(urgency) {
  const cls = { Emergency: "urg-emergency", Urgent: "urg-urgent", Routine: "urg-routine", Foundation: "urg-foundation" }[urgency] ?? "urg-foundation";
  return `<span class="badge ${cls}">${esc(urgency)}</span>`;
}

/** On a colored hero gradient, the light/translucent treatment is used
 * instead of the colored variant above (which is unreadable on a red hero) —
 * mirrors ModuleDetail.tsx/ToolkitDetail.tsx passing a white className
 * override to UrgencyBadge specifically inside the hero. */
function heroUrgencyBadge(urgency) {
  return `<span class="badge badge-outline">${esc(urgency)}</span>`;
}

function isRedFlag(heading) {
  return /red flag|🚩|⚠/i.test(heading || "");
}

// ------------------------------------------------------------------ pages --

function page({ title, backHref, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(title)} — DCT Survival Kit content review</title>
<link rel="stylesheet" href="${backHref ? "../assets/style.css" : "assets/style.css"}" />
</head>
<body>
<div class="topbar">
  <a href="${backHref ?? "index.html"}" class="topbar-back">${backHref ? "← All content" : "DCT Survival Kit — content review"}</a>
  <span class="topbar-note">Content-only preview · not the live app</span>
</div>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

function renderModulePage(m) {
  const red = (h) => (isRedFlag(h) ? " red-flag" : "");
  const sections = m.sections.map((s) => `
    <section class="mod-section${red(s.heading)}">
      ${s.heading ? `<h2>${isRedFlag(s.heading) ? "⚠ " : ""}${esc(s.heading)}</h2>` : ""}
      ${s.items.map(renderClinicalItem).join("\n")}
    </section>`).join("\n");

  const body = `
  <div class="hero hero-green">
    <div class="badges">
      <span class="badge badge-outline">${esc(m.category)}</span>
      ${heroUrgencyBadge(m.urgency)}
      <span class="id-tag">${esc(m.id)}</span>
    </div>
    <h1>${esc(m.title)}</h1>
    ${m.quote ? `<p class="quote">${esc(m.quote)}</p>` : ""}
    ${m.tags?.length ? `<div class="tags">${m.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}
  </div>
  <div class="disclaimer">Educational aid only. This is a personal reference and survival resource. It does not replace senior clinical advice, local trust policies, professional judgment, or emergency escalation procedures.</div>
  ${sections}
  <section class="sources">
    <h2>Sources &amp; review</h2>
    <dl class="meta-grid">
      <div><dt>Content version</dt><dd>${esc(m.version)}</dd></div>
      <div><dt>Status</dt><dd>${esc(m.status)}</dd></div>
      <div><dt>Clinical owner</dt><dd>${esc(m.clinicalOwner)}</dd></div>
      <div><dt>Last reviewed</dt><dd>${esc(m.lastReviewed)}</dd></div>
      <div><dt>Next review</dt><dd>${esc(m.nextReview)}</dd></div>
      <div><dt>Category</dt><dd>${esc(m.category)}</dd></div>
    </dl>
  </section>`;

  return page({ title: m.title, backHref: "../index.html", body });
}

function renderToolkitPage(t) {
  const heroClass = t.urgency === "Emergency" ? "hero-red" : "hero-green";

  const stepsHtml = t.steps?.length
    ? `<div class="steps">${t.steps.map((s, i) => `
      <div class="step"><span class="step-n">${i + 1}</span><p>${esc(s)}</p></div>`).join("")}</div>`
    : "";

  const tablesHtml = t.tables?.length
    ? `<div class="tables-block">${t.tables.map(renderTable).join("\n")}</div>`
    : "";

  const linksHtml = t.links?.length
    ? `<div class="links">${t.links.map((l) => `<a class="link-card" href="${esc(l.url)}" target="_blank" rel="noreferrer">${esc(l.label)} ↗</a>`).join("")}</div>`
    : "";

  const itemsHtml = t.items?.length
    ? `<div class="items-block">
        ${t.itemsLabel ? `<p class="items-label">${esc(t.itemsLabel)}</p>` : ""}
        <div class="checklist">
          ${t.items.map((it) => `<div class="check-row"><span class="check-box" aria-hidden="true"></span><span>${esc(it)}</span></div>`).join("")}
        </div>
      </div>`
    : "";

  const escalationHtml = t.escalation && !/needs clinical review/i.test(t.escalation)
    ? `<div class="escalation-card"><h2>Escalation</h2><p>${esc(t.escalation)}</p></div>`
    : "";

  const related = (t.relatedModules ?? [])
    .map((id) => MODULES.find((m) => m.id === id))
    .filter(Boolean);
  const relatedHtml = related.length
    ? `<div class="related"><h2>Related modules</h2><div class="related-grid">${related.map((m) => `<a href="../modules/${m.slug}.html" class="related-card">${esc(m.title)} ${urgencyBadge(m.urgency)}</a>`).join("")}</div></div>`
    : "";

  const body = `
  <div class="hero ${heroClass}">
    <div class="badges">
      <span class="tk-icon">${t.icon}</span>
      <span class="badge badge-outline">${esc(t.type)}</span>
      ${heroUrgencyBadge(t.urgency)}
      <span class="id-tag">${esc(t.id)}</span>
    </div>
    <h1>${esc(t.title)}</h1>
    <p class="intro">${esc(t.introduction)}</p>
  </div>
  <div class="disclaimer">Educational aid only. This is a personal reference and survival resource. It does not replace senior clinical advice, local trust policies, professional judgment, or emergency escalation procedures.</div>
  ${stepsHtml}
  ${tablesHtml}
  ${linksHtml}
  ${itemsHtml}
  ${escalationHtml}
  ${relatedHtml}
  <section class="sources">
    <h2>Sources &amp; review</h2>
    <dl class="meta-grid">
      <div><dt>Content version</dt><dd>${esc(t.version)}</dd></div>
      <div><dt>Status</dt><dd>${esc(t.status)}</dd></div>
      <div><dt>Clinical owner</dt><dd>${esc(t.clinicalOwner)}</dd></div>
      <div><dt>Last reviewed</dt><dd>${esc(t.lastReviewed)}</dd></div>
    </dl>
    <p class="sources-text">${esc(t.sources)}</p>
  </section>`;

  return page({ title: t.title, backHref: "../index.html", body });
}

function renderIndex() {
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    modules: MODULES.filter((m) => m.category === c.key).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
  }));

  const modulesHtml = byCategory.map((c) => `
    <div class="cat-group">
      <h3>${c.icon} ${esc(c.label)} <span class="cat-count">${c.modules.length}</span></h3>
      <div class="list">
        ${c.modules.map((m) => `
          <a class="list-row" href="modules/${m.slug}.html">
            <span class="list-id">${esc(m.id)}</span>
            <span class="list-title">${esc(m.title)}</span>
            ${urgencyBadge(m.urgency)}
          </a>`).join("")}
      </div>
    </div>`).join("");

  const toolkitsSorted = [...TOOLKITS].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const toolkitsHtml = `
    <div class="list">
      ${toolkitsSorted.map((t) => `
        <a class="list-row" href="toolkits/${t.slug}.html">
          <span class="list-id">${esc(t.id)}</span>
          <span class="tk-icon-sm">${t.icon}</span>
          <span class="list-title">${esc(t.title)}</span>
          <span class="badge badge-outline">${esc(t.type)}</span>
          ${urgencyBadge(t.urgency)}
        </a>`).join("")}
    </div>`;

  const body = `
  <div class="review-intro">
    <h1>${esc(PRODUCT.name)} — content review</h1>
    <p>A content-only click-through of every module and toolkit, for clinical review. No login, no payments, no app chrome — just the words, structure and tables, styled to match the live app. Generated straight from the current <code>src/data</code> content, so it always reflects what's actually in the codebase.</p>
    <p class="review-count">${MODULES.length} modules · ${TOOLKITS.length} toolkits</p>
  </div>
  <h2 class="section-title">Modules</h2>
  ${modulesHtml}
  <h2 class="section-title">Toolkits</h2>
  ${toolkitsHtml}`;

  return page({ title: "Content review", backHref: null, body });
}

// -------------------------------------------------------------------- CSS --

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Inter:wght@400;500;600;700;800&display=swap');
:root {
  --bg: hsl(45 20% 97%); --fg: hsl(80 8% 13%); --card: hsl(44 15% 93%); --muted: hsl(44 14% 88%);
  --muted-fg: hsl(90 4% 35%); --border: hsl(40 15% 85%); --green-dark: hsl(140 16% 22%); --green-mid: hsl(140 16% 30%);
  --gold: hsl(38 46% 57%); --gold-ink: hsl(36 55% 30%); --gold-soft: hsl(38 55% 92%);
  --red: hsl(4 60% 41%); --red-dark: hsl(6 60% 34%); --red-soft: hsl(4 55% 95%);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: hsl(90 10% 9%); --fg: hsl(45 25% 92%); --card: hsl(90 9% 13%); --muted: hsl(90 8% 17%);
    --muted-fg: hsl(45 10% 68%); --border: hsl(90 8% 22%); --green-dark: hsl(140 22% 68%); --green-mid: hsl(140 18% 34%);
    --gold: hsl(38 55% 68%); --gold-ink: hsl(38 60% 78%); --gold-soft: hsl(38 35% 16%);
    --red: hsl(4 65% 68%); --red-dark: hsl(6 55% 46%); --red-soft: hsl(4 40% 16%);
  }
}
:root[data-theme="dark"] {
  --bg: hsl(90 10% 9%); --fg: hsl(45 25% 92%); --card: hsl(90 9% 13%); --muted: hsl(90 8% 17%);
  --muted-fg: hsl(45 10% 68%); --border: hsl(90 8% 22%); --green-dark: hsl(140 22% 68%); --green-mid: hsl(140 18% 34%);
  --gold: hsl(38 55% 68%); --gold-ink: hsl(38 60% 78%); --gold-soft: hsl(38 35% 16%);
  --red: hsl(4 65% 68%); --red-dark: hsl(6 55% 46%); --red-soft: hsl(4 40% 16%);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: 'Inter', system-ui, sans-serif; padding: 0 16px 64px; }
h1, h2, h3 { font-family: 'Newsreader', Georgia, serif; }
.wrap { max-width: 760px; margin: 0 auto; }
a { color: inherit; }
.topbar { max-width: 760px; margin: 0 auto; padding: 14px 0 6px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.topbar-back { font-weight: 700; font-size: 14px; text-decoration: none; color: var(--green-mid); }
.topbar-note { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-fg); background: var(--gold-soft); border: 1px solid var(--gold); border-radius: 999px; padding: 3px 10px; }
.review-intro { padding: 8px 2px 4px; }
.review-intro p { color: var(--muted-fg); line-height: 1.6; max-width: 62ch; }
.review-intro code { background: var(--muted); padding: 1px 6px; border-radius: 4px; font-size: 13px; }
.review-count { font-weight: 700; color: var(--fg) !important; }
.section-title { margin-top: 28px; font-size: 20px; }
.cat-group { margin-top: 14px; }
.cat-group h3 { font-size: 15px; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
.cat-count { font-size: 11px; font-weight: 600; color: var(--muted-fg); background: var(--muted); border-radius: 999px; padding: 1px 8px; }
.list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
.list-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); background: var(--card); border-radius: 10px; text-decoration: none; color: var(--fg); }
.list-row:hover { border-color: var(--green-mid); }
.list-id { font-size: 11px; color: var(--muted-fg); font-weight: 700; min-width: 30px; }
.list-title { flex: 1; font-weight: 600; font-size: 14.5px; }
.tk-icon-sm { font-size: 15px; }
.badge { border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
.badge-outline { border: 1px solid var(--border); color: var(--muted-fg); background: var(--muted); }
.urg-emergency { background: hsl(4 60% 41% / 0.12); color: var(--red); border: 1px solid hsl(4 60% 41% / 0.3); }
.urg-urgent { background: var(--gold-soft); color: var(--gold-ink); border: 1px solid hsl(38 46% 57% / 0.4); }
.urg-routine { background: hsl(140 16% 30% / 0.1); color: var(--green-mid); border: 1px solid hsl(140 16% 30% / 0.25); }
.urg-foundation { background: var(--muted); color: var(--muted-fg); border: 1px solid var(--border); }
.hero { margin-top: 4px; border-radius: 18px; padding: 28px 26px; color: hsl(45 33% 95%); }
.hero-green { background: linear-gradient(135deg, var(--green-dark), var(--green-mid)); }
.hero-red { background: linear-gradient(135deg, var(--red), var(--red-dark)); }
.hero .badges { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.hero .badge-outline { background: hsl(0 0% 100% / 0.15); border: 1px solid hsl(0 0% 100% / 0.2); color: inherit; }
.id-tag { font-size: 11px; text-transform: uppercase; color: hsl(45 20% 100% / 0.55); }
.tk-icon { font-size: 22px; }
.hero h1 { font-size: 30px; font-weight: 600; margin: 12px 0 0; }
.hero .quote, .hero .intro { margin: 10px 0 0; max-width: 60ch; font-size: 16px; color: hsl(45 20% 100% / 0.85); }
.hero .quote { font-style: italic; }
.hero .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.hero .tag { background: hsl(0 0% 100% / 0.1); border-radius: 999px; padding: 2px 10px; font-size: 11px; color: hsl(45 20% 100% / 0.7); }
.disclaimer { margin-top: 16px; border: 1px solid hsl(38 46% 57% / 0.4); background: var(--gold-soft); color: var(--gold-ink); border-radius: 10px; padding: 10px 14px; font-size: 13px; line-height: 1.5; }
.mod-section { margin-top: 14px; border: 1px solid var(--border); background: var(--card); border-radius: 14px; padding: 18px 20px; }
.mod-section.red-flag { border-color: hsl(4 60% 41% / 0.35); background: var(--red-soft); }
.mod-section h2 { font-size: 18px; font-weight: 600; margin: 0 0 10px; }
.mod-section.red-flag h2 { color: var(--red); }
.citem { margin-bottom: 10px; }
.citem:last-child { margin-bottom: 0; }
.citem-head { font-weight: 700; margin: 0 0 3px; }
.citem-line { font-size: 14.5px; line-height: 1.6; margin: 0 0 4px; color: color-mix(in srgb, var(--fg) 88%, transparent); }
.cchecklist-items { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.cchecklist-item { display: flex; gap: 9px; align-items: flex-start; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 55%, transparent); border-radius: 8px; padding: 7px 10px; font-size: 14.5px; line-height: 1.5; }
.cchecklist-box { flex-shrink: 0; width: 16px; height: 16px; border-radius: 4px; border: 2px solid color-mix(in srgb, var(--green-mid) 40%, transparent); color: var(--green-mid); font-size: 10px; display: flex; align-items: center; justify-content: center; opacity: 0.5; }
.steps { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.step { display: flex; gap: 12px; border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 12px 14px; }
.step-n { flex-shrink: 0; width: 26px; height: 26px; border-radius: 99px; background: var(--green-mid); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.step p { margin: 2px 0 0; font-size: 14px; line-height: 1.55; }
.tables-block { margin-top: 16px; border: 1px solid var(--border); background: var(--card); border-radius: 14px; padding: 18px 20px; }
.ctable-block { margin-bottom: 16px; }
.ctable-block:last-child { margin-bottom: 0; }
.ctable-label { font-weight: 700; margin: 0 0 8px; }
.ctable-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 8px 11px; border-bottom: 1px solid var(--border); vertical-align: top; }
thead th { background: var(--muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-fg); }
tbody tr:last-child td { border-bottom: none; }
.links { margin-top: 16px; display: grid; gap: 8px; }
.link-card { display: block; border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 12px 14px; font-size: 14px; font-weight: 600; text-decoration: none; }
.items-block { margin-top: 16px; }
.items-label { font-family: 'Newsreader', serif; font-size: 17px; font-weight: 600; margin: 0 0 10px; }
.checklist { display: flex; flex-direction: column; gap: 7px; }
.check-row { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--border); background: var(--card); border-radius: 10px; padding: 10px 12px; font-size: 14.5px; line-height: 1.5; }
.check-box { flex-shrink: 0; margin-top: 2px; width: 18px; height: 18px; border-radius: 5px; border: 2px solid color-mix(in srgb, var(--green-mid) 35%, transparent); }
.escalation-card { margin-top: 16px; border: 1px solid hsl(4 60% 41% / 0.3); background: hsl(4 60% 41% / 0.05); border-radius: 12px; padding: 16px 18px; }
.escalation-card h2 { font-size: 16px; margin: 0 0 6px; color: var(--red); }
.escalation-card p { margin: 0; font-size: 14.5px; line-height: 1.6; }
.related { margin-top: 16px; }
.related h2 { font-size: 16px; margin: 0 0 8px; }
.related-grid { display: grid; gap: 8px; }
.related-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--border); background: var(--card); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; font-weight: 600; text-decoration: none; }
.sources { margin-top: 18px; border: 1px solid var(--border); background: var(--muted); border-radius: 14px; padding: 18px 20px; font-size: 13px; }
.sources h2 { font-size: 16px; margin: 0 0 10px; }
.meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 8px 20px; }
.meta-grid dt { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-fg); }
.meta-grid dd { margin: 2px 0 0; font-weight: 600; }
.sources-text { margin: 12px 0 0; color: var(--muted-fg); }
`;

// ----------------------------------------------------------------- build --

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(path.join(OUT, "modules"), { recursive: true });
mkdirSync(path.join(OUT, "toolkits"), { recursive: true });
mkdirSync(path.join(OUT, "assets"), { recursive: true });

writeFileSync(path.join(OUT, "assets", "style.css"), CSS.trim() + "\n");
writeFileSync(path.join(OUT, "index.html"), renderIndex());

for (const m of MODULES) {
  writeFileSync(path.join(OUT, "modules", `${m.slug}.html`), renderModulePage(m));
}
for (const t of TOOLKITS) {
  writeFileSync(path.join(OUT, "toolkits", `${t.slug}.html`), renderToolkitPage(t));
}

console.log(`Generated ${MODULES.length} module pages and ${TOOLKITS.length} toolkit pages in ${OUT}`);
