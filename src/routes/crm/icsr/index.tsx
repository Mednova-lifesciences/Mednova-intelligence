import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download, ShieldAlert, Activity } from "lucide-react";
import { CrmShell, CrmHeader, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import {
  fetchCases,
  fetchIcsrStats,
  CSV_HEADER,
  caseToCsvRow,
  timelinessOf,
  isFlagged,
  fmtDate,
  CASE_STATUSES,
  SERIOUSNESS,
  type CaseFilters,
} from "@/lib/icsr-queries";

export const Route = createFileRoute("/crm/icsr/")({
  head: () => ({
    meta: [
      { title: "ICSR Intake Register | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Single point of capture for every suspected adverse drug reaction — logged at receipt, with duplicate detection and submission timeliness tracking.",
      },
      { property: "og:title", content: "ICSR Intake Register | MedNovaOS Pharmacovigilance" },
      { property: "og:description", content: "Adverse event case register with duplicate detection and timeliness tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IcsrRegisterPage,
});

const VIEWS: { key: NonNullable<CaseFilters["view"]>; label: string }[] = [
  { key: "all", label: "All" },
  { key: "flag", label: "Duplicate review" },
  { key: "serious", label: "Serious" },
  { key: "late", label: "Late" },
  { key: "open", label: "Not submitted" },
  { key: "drafts", label: "Drafts" },
];

export function Tag({ tone = "muted", children }: { tone?: "muted" | "bad" | "warn" | "ok"; children: React.ReactNode }) {
  const map = {
    muted: "bg-muted text-muted-foreground",
    bad: "bg-destructive/10 text-destructive",
    warn: "bg-amber-500/15 text-amber-700",
    ok: "bg-brand/10 text-brand",
  } as const;
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

function IcsrRegisterPage() {
  const [view, setView] = useState<NonNullable<CaseFilters["view"]>>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [seriousness, setSeriousness] = useState("");

  const filters: CaseFilters = { view, search, status, seriousness };
  const { data: cases, isLoading } = useQuery({
    queryKey: ["icsr-cases", view, search, status, seriousness],
    queryFn: () => fetchCases(filters),
  });
  const { data: stats } = useQuery({ queryKey: ["icsr-stats"], queryFn: fetchIcsrStats });

  const rows = useMemo(() => cases ?? [], [cases]);

  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [CSV_HEADER.map(q).join(",")].concat(rows.map((c) => caseToCsvRow(c).map(q).join(",")));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mednova-icsr-register.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <CrmShell>
      <CrmHeader
        title="ICSR Intake Register"
        subtitle="Every report is logged at the moment of receipt — before triage, before validity assessment, and whether or not it later turns out to be a duplicate."
        actions={
          <>
            <Link to="/crm/icsr/activity" className={btnGhost}>
              <Activity className="h-4 w-4" /> Activity
            </Link>
            <Link to="/crm/icsr/performance" className={btnGhost}>
              <ShieldAlert className="h-4 w-4" /> Performance
            </Link>
            <button className={btnGhost} onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <Link to="/crm/icsr/new" className={btnPrimary}>
              <Plus className="h-4 w-4" /> Report an event
            </Link>
          </>
        }
      />

      <div className="px-8 py-6">
        {stats && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { k: "Reports logged", v: stats.total, alert: false },
              { k: "Awaiting duplicate review", v: stats.awaiting_dup_review, alert: stats.awaiting_dup_review > 0 },
              { k: "Serious cases", v: stats.serious, alert: false },
              { k: "Overdue now", v: stats.overdue, alert: stats.overdue > 0 },
              { k: "Drafts", v: stats.drafts, alert: false },
            ].map((m) => (
              <div
                key={m.k}
                className={`rounded-lg border border-border bg-card p-4 shadow-sm ${m.alert ? "border-l-4 border-l-destructive" : ""}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.k}</div>
                <div className={`mt-2 text-2xl font-bold ${m.alert ? "text-destructive" : "text-foreground"}`}>{m.v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-lg border border-border bg-card">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`border-r border-border px-3 py-2 text-xs font-semibold last:border-r-0 transition-colors ${
                  view === v.key ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="Search case ID, patient, product, reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={`${inputClass} max-w-[180px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={`${inputClass} max-w-[180px]`}
            value={seriousness}
            onChange={(e) => setSeriousness(e.target.value)}
          >
            <option value="">All seriousness</option>
            {SERIOUSNESS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                {[
                  "Case ID",
                  "Day 0",
                  "Channel",
                  "Source",
                  "Product",
                  "Patient",
                  "Event",
                  "Seriousness",
                  "Duplicate",
                  "Due",
                  "Submitted",
                  "Timeliness",
                  "Status",
                  "",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={14} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-muted-foreground">
                    Nothing matches this filter.
                  </td>
                </tr>
              )}
              {rows.map((c) => {
                const t = timelinessOf(c);
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 ${isFlagged(c) ? "bg-destructive/5" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">{c.case_ref}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(c.received_date)}</td>
                    <td className="px-4 py-3">{c.channel ?? "—"}</td>
                    <td className="px-4 py-3">{c.source_type ?? "—"}</td>
                    <td className="px-4 py-3">{c.product ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {[c.patient_initials, c.patient_age, c.patient_sex].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="max-w-[240px] px-4 py-3">{c.event_description ?? "—"}</td>
                    <td className="px-4 py-3">
                      {c.seriousness === "Serious" ? <Tag tone="warn">Serious</Tag> : <Tag>{c.seriousness ?? "—"}</Tag>}
                    </td>
                    <td className="px-4 py-3">
                      {c.duplicate_outcome === "Confirmed duplicate" ? (
                        <Tag tone="bad">Duplicate of {c.duplicate_of}</Tag>
                      ) : isFlagged(c) ? (
                        <Tag tone="bad">Review</Tag>
                      ) : c.duplicate_outcome === "Unique" ? (
                        <Tag tone="ok">Unique</Tag>
                      ) : (
                        <Tag>—</Tag>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(c.due_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(c.submitted_date)}</td>
                    <td className="px-4 py-3">
                      <Tag tone={t === "Late" || t === "Overdue" ? "bad" : t === "On time" ? "ok" : "warn"}>{t}</Tag>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{c.is_draft ? <Tag>Draft</Tag> : c.status}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/crm/icsr/$id"
                        params={{ id: c.id }}
                        className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
