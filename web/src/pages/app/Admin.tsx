import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ShieldCheck, BookOpen, Wrench, FileWarning, Users, UserCog, GitBranch, AlertTriangle, CreditCard, MessageSquare,
} from "lucide-react";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { MODULES } from "@/data/modules";
import { TOOLKITS } from "@/data/toolkits";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { AdminUsersTab } from "@/components/app/AdminUsersTab";
import { AdminStripeCheckTab } from "@/components/app/AdminStripeCheckTab";
import { AdminFeedbackTab } from "@/components/app/AdminFeedbackTab";
import { AdminIssuesTab } from "@/components/app/AdminIssuesTab";

type Tab = "modules" | "toolkits" | "issues" | "roles" | "users" | "stripe" | "feedback";

const ROLES = [
  { role: "Editor", desc: "Draft and edit content, cannot publish." },
  { role: "Clinical reviewer", desc: "Review drafts for clinical accuracy." },
  { role: "Clinical owner", desc: "Approve clinical content and set review dates." },
  { role: "Administrator", desc: "Manage users, roles and publishing." },
];

export default function Admin() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("modules");

  if (!isAdmin) return <Navigate to="/app" replace />;

  const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "feedback", label: "Feedback", icon: MessageSquare },
    { key: "issues", label: "Reported issues", icon: FileWarning },
    { key: "stripe", label: "Stripe check", icon: CreditCard },
    { key: "modules", label: "Modules", icon: BookOpen },
    { key: "toolkits", label: "Toolkits", icon: Wrench },
    { key: "roles", label: "Roles", icon: UserCog },
  ];

  return (
    <PageContainer>
      <PageHeading
        kicker="Admin"
        title="Content management"
        description="Preparation interface for managing modules, toolkits, review dates and reported issues. Only published content appears to subscribers."
        actions={<ShieldCheck className="h-8 w-8 text-brand-green" />}
      />

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold-ink">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        This is an admin <strong>architecture preview</strong>. Editing and
        publishing are not wired to a backend yet — content is served from
        structured data files ready to move to a database/CMS.
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.key ? "border-brand-green bg-brand-green text-white" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <AdminUsersTab />}

      {tab === "feedback" && <AdminFeedbackTab />}

      {tab === "stripe" && <AdminStripeCheckTab />}

      {tab === "modules" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last reviewed</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs">{m.id}</td>
                  <td className="px-4 py-2.5 font-medium">{m.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.category}</td>
                  <td className="px-4 py-2.5"><UrgencyBadge urgency={m.urgency} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">v{m.version}</td>
                  <td className="px-4 py-2.5"><StatusPill status={m.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-brand-gold-ink">{m.lastReviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "toolkits" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody>
              {TOOLKITS.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-2.5 font-medium">{t.icon} {t.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.type}</td>
                  <td className="px-4 py-2.5"><UrgencyBadge urgency={t.urgency} /></td>
                  <td className="px-4 py-2.5">
                    {t.placeholder ? (
                      <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-semibold text-brand-gold-ink">Pending review</span>
                    ) : (
                      <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">Published</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "issues" && <AdminIssuesTab />}

      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4" /> Publishing workflow: Editor → Clinical reviewer → Clinical owner → Published
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-serif text-lg font-semibold">{r.role}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-success/12 text-success",
    draft: "bg-muted text-muted-foreground",
    "needs-review": "bg-brand-gold/20 text-brand-gold-ink",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", map[status] ?? "bg-muted")}>{status}</span>;
}
