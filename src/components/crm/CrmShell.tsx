import { Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/mednova-logo.png.asset.json";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutGrid,
  Building2,
  Users,
  Activity,
  CheckSquare,
  GitBranch,
  Mail,
  BarChart3,
  StickyNote,
  Search,
  Bell,
  Sparkles,
  FileText,
} from "lucide-react";

const NAV = [
  { to: "/crm", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/crm/companies", label: "Companies", icon: Building2 },
  { to: "/crm/contacts", label: "Contacts", icon: Users },
  { to: "/crm/activities", label: "Activities", icon: Activity },
  { to: "/crm/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/crm/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/crm/emails", label: "Emails", icon: Mail },
  { to: "/crm/reports", label: "Reports", icon: BarChart3 },
  { to: "/crm/notes", label: "Notes", icon: StickyNote },
] as const;


export function CrmShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-navy text-navy-foreground">
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <div>
            <img
              src={logo.url}
              alt="MedNova Lifesciences logo"
              className="h-7 w-auto brightness-0 invert"
            />
            <div className="mt-1 text-[11px] font-semibold tracking-widest text-navy-muted">CRM WORKSPACE</div>
          </div>
        </div>

        <div className="px-5 pb-2 pt-5 text-[11px] font-semibold tracking-widest text-navy-muted">
          WORKSPACE
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-navy-muted transition-colors hover:bg-white/5 hover:text-navy-foreground"
              activeProps={{ className: "bg-white/10 text-navy-foreground font-semibold" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-lg bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <FileText className="h-4 w-4 text-brand" />
              Regulatory Intelligence
            </div>
            <p className="mt-2 text-xs leading-relaxed text-navy-muted">
              Discovered companies flow directly into CRM.
            </p>
            <Link to="/" className="mt-3 inline-block text-xs font-semibold text-brand">
              Open Regulatory Intelligence →
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-8 py-3">
          <form
            className="relative w-full max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/crm/search", search: { q } });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies, contacts, deals..."
              className="h-10 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </form>
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-navy-foreground">
              MN
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function CrmHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function CrmCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export const btnPrimary =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60";
export const btnGhost =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted";
export const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand";

export const ngn = (v: number) => "NGN " + Math.round(Number(v || 0)).toLocaleString("en-NG");

export function relativeDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
