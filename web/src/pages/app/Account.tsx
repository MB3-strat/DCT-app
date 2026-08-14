import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  User, Mail, BadgeCheck, CreditCard, WifiOff, FileWarning,
  Wrench, LogOut, ShieldCheck, FileText, BookOpen, Trash2,
} from "lucide-react";
import { collection, getDocs, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const subLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    canceled: "Canceled",
    past_due: "Past due",
    none: "No subscription",
  };

  async function deleteAllInfo() {
    if (!user || !db) {
      toast.error("Please sign in again before deleting data.");
      return;
    }

    const confirmed = window.confirm(
      "Delete your bookmarks, progress and Trust settings? This cannot be undone. " +
        "(Issue reports you've submitted are kept as an audit record.)",
    );

    if (!confirmed) return;

    try {
      const [bookmarksSnap, progressSnap] = await Promise.all([
        getDocs(collection(db, "profiles", user.id, "bookmarks")),
        getDocs(collection(db, "profiles", user.id, "progress")),
      ]);

      const batch = writeBatch(db);
      bookmarksSnap.docs.forEach((d) => batch.delete(d.ref));
      progressSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.set(
        doc(db, "profiles", user.id),
        { trustSettings: {}, updatedAt: serverTimestamp() },
        { merge: true },
      );
      await batch.commit();
    } catch {
      toast.error("Could not delete your data.");
      return;
    }

    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("dct:")) {
        window.localStorage.removeItem(key);
      }
    }

    toast.success("Your app data has been deleted.");
    window.location.reload();
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeading kicker="Your account" title="Account" description="Manage your profile, subscription and app preferences." />

      {/* Profile */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green font-serif text-2xl font-bold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold">{user.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-semibold text-brand-gold-ink">
                  Email confirmation pending
                </span>
              )}
              {user.roles.map((r) => (
                <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-brand-green" /> Subscription
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subLabel[user.subscription]}{user.renewsOn ? ` · renews ${user.renewsOn}` : ""}
            </p>
          </div>
          <Link to="/app/billing" className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-mid">
            Manage billing
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <LinkTile to="/app/offline" icon={WifiOff} title="Offline content" desc="Download status & sync" />
        <LinkTile to="/app/sources" icon={BookOpen} title="Sources & review" desc="How content is maintained" />
        <LinkTile to="/app/disclaimer" icon={FileText} title="Disclaimer & intended use" desc="Read before you rely on it" />
        <LinkTile to="/app/report/clinical" icon={FileWarning} title="Report a clinical issue" desc="Flag content for review" />
        <LinkTile to="/app/report/technical" icon={Wrench} title="Report a technical issue" desc="Bugs & problems" />
        {user.roles.includes("admin") && (
          <LinkTile to="/app/admin" icon={ShieldCheck} title="Admin" desc="Content & review management" />
        )}
      </div>

      <button
        onClick={async () => { await logout(); navigate("/"); toast("Signed out."); }}
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
      <button
        onClick={deleteAllInfo}
        className="ml-3 mt-8 inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 font-semibold text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" /> Delete all info
      </button>
    </PageContainer>
  );
}

function LinkTile({ to, icon: Icon, title, desc }: { to: string; icon: typeof User; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-brand-green/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="truncate text-sm text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
