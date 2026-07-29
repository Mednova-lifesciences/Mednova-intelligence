import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, CrmCard, btnGhost } from "@/components/crm/CrmShell";
import { fetchIcsrStats, fetchRecentIcsrEvents, fmtDateTime } from "@/lib/icsr-queries";

export const Route = createFileRoute("/crm/icsr/performance")({
  head: () => ({
    meta: [
      { title: "Intake Performance | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Pharmacovigilance intake metrics: reports logged, duplicate review backlog, serious cases, on-time submission rate and the full activity trail.",
      },
      { property: "og:title", content: "Intake Performance | MedNovaOS Pharmacovigilance" },
      { property: "og:description", content: "Pharmacovigilance intake metrics and activity trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerformancePage,
});

function Bars({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = data.length ? Math.max(...data.map((d) => d.count)) : 1;
  return (
    <CrmCard className="mb-4">
      <h3 className="mb-3 text-base font-bold text-foreground">{title}</h3>
      {data.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      {data.map((d) => (
        <div key={d.label} className="mb-2 grid grid-cols-[160px_1fr_40px] items-center gap-3 text-sm">
          <span className="truncate text-foreground">{d.label}</span>
          <span className="h-2 overflow-hidden rounded bg-muted">
            <i className="block h-full bg-brand" style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
          <span className="text-right text-xs text-muted-foreground">{d.count}</span>
        </div>
      ))}
    </CrmCard>
  );
}

function PerformancePage() {
  const { data: s } = useQuery({ queryKey: ["icsr-stats"], queryFn: fetchIcsrStats });
  const { data: events } = useQuery({ queryKey: ["icsr-activity"], queryFn: () => fetchRecentIcsrEvents(120) });

  const done = (s?.submitted ?? 0);
  const rate = done ? Math.round(((done - (s?.late ?? 0)) / done) * 100) : null;

  const metrics = s
    ? [
        ["Reports logged", s.total, "Everything received, including duplicates and invalid reports.", ""],
        ["Unique cases", s.unique_cases, "After confirmed duplicates are linked, not deleted.", ""],
        ["Awaiting duplicate review", s.awaiting_dup_review, "Fingerprint matched. A person still has to decide.", s.awaiting_dup_review ? "alert" : ""],
        ["Serious cases", s.serious, "Each carries a 15 calendar day submission clock.", ""],
        ["Submitted", s.submitted, "Cases with a recorded submission date.", ""],
        ["Submitted late", s.late, "Each one needs a deviation record and a root cause.", s.late ? "alert" : ""],
        ["Overdue now", s.overdue, "Past the due date with no submission recorded.", s.overdue ? "alert" : ""],
        ["On-time rate", rate === null ? "—" : `${rate}%`, "Report this at every management review. Target is 100%.", rate === null ? "" : rate === 100 ? "good" : "alert"],
        ["Open cases", s.open_cases, "Not yet submitted or closed. Backlog indicator.", ""],
      ]
    : [];

  return (
    <CrmShell>
      <CrmHeader
        title="Intake performance"
        subtitle="These are the figures an inspector asks for and that most companies cannot produce on request."
        actions={
          <Link to="/crm/icsr" className={btnGhost}>
            Back to register
          </Link>
        }
      />

      <div className="px-8 py-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metrics.map(([k, v, n, cls]) => (
            <div
              key={k as string}
              className={`rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
                cls === "alert" ? "border-l-4 border-l-destructive" : cls === "good" ? "border-l-4 border-l-brand" : ""
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k as string}</div>
              <div className={`mt-2 text-2xl font-bold ${cls === "alert" ? "text-destructive" : "text-foreground"}`}>
                {v as string}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{n as string}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Bars title="Where reports come in" data={s?.by_channel ?? []} />
          <Bars title="Who is reporting" data={s?.by_source ?? []} />
        </div>

        <CrmCard>
          <h3 className="mb-1 text-base font-bold text-foreground">Activity trail</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Every action against every case, in sequence and attributable. This is what turns a spreadsheet into a
            system of record.
          </p>
          <div className="divide-y divide-border">
            {(events ?? []).map((e) => (
              <div key={e.id} className="grid gap-2 py-2 text-sm md:grid-cols-[190px_130px_1fr]">
                <span className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</span>
                <span className="text-xs font-semibold text-brand">{e.icsr_cases?.case_ref ?? "—"}</span>
                <span className="text-foreground">
                  <span className="font-semibold">{e.event_type}</span> — {e.message}
                </span>
              </div>
            ))}
            {(events ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>}
          </div>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
