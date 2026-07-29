import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  GitBranch,
  Mail,
  CheckSquare,
  StickyNote,
  UserPlus,
  Trophy,
  XCircle,
  FileBarChart,
  Activity as ActivityIcon,
} from "lucide-react";
import { CrmShell, CrmHeader, CrmCard, inputClass } from "@/components/crm/CrmShell";
import { fetchActivities } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/activities")({
  head: () => ({
    meta: [
      { title: "Activities | MedNovaOS CRM" },
      {
        name: "description",
        content: "CRM audit log of every action: companies added, stage moves, contacts, emails, tasks and notes.",
      },
      { property: "og:title", content: "Activities | MedNovaOS CRM" },
      { property: "og:description", content: "Full CRM audit log across every company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivitiesPage,
});

const ACTIVITY_TYPES = [
  "Company Added",
  "Stage Changed",
  "Company Won",
  "Company Lost",
  "Contact Created",
  "Contact Updated",
  "Email Generated",
  "Email Sent",
  "Task Created",
  "Task Updated",
  "Task Completed",
  "Task Deleted",
  "Note Created",
  "Note Updated",
  "Note Deleted",
  "Report Generated",
];

function iconFor(type: string) {
  if (type.startsWith("Company Won")) return Trophy;
  if (type.startsWith("Company Lost")) return XCircle;
  if (type.startsWith("Company")) return Building2;
  if (type.startsWith("Stage")) return GitBranch;
  if (type.startsWith("Contact")) return UserPlus;
  if (type.startsWith("Email")) return Mail;
  if (type.startsWith("Task")) return CheckSquare;
  if (type.startsWith("Note")) return StickyNote;
  if (type.startsWith("Report")) return FileBarChart;
  return ActivityIcon;
}

function ActivitiesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const { data } = useQuery({
    queryKey: ["crm-activities", "all", search, type, sort],
    queryFn: () => fetchActivities(300, undefined, { search, type, sort }),
  });
  const rows = data ?? [];

  return (
    <CrmShell>
      <CrmHeader title="Activities" subtitle={`${rows.length} logged events · CRM audit log`} />
      <div className="space-y-6 px-8 py-6">
        <CrmCard>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All activity types</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </CrmCard>

        <CrmCard>
          <div className="divide-y divide-border">
            {rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">No activity yet.</p>}
            {rows.map((a) => {
              const Icon = iconFor(a.activity_type);
              return (
                <div key={a.id} className="flex items-start gap-4 py-3 text-sm">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{a.activity_type}</span>
                      {a.company_id && a.companies?.name && (
                        <Link
                          to="/crm/companies/$id"
                          params={{ id: a.company_id }}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground hover:text-brand"
                        >
                          {a.companies.name}
                        </Link>
                      )}
                    </div>
                    <p className="mt-0.5 text-foreground">{a.message}</p>
                    {a.description && <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>{a.actor}</div>
                    <div>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
