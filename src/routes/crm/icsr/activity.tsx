import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, CrmCard, btnGhost, inputClass } from "@/components/crm/CrmShell";
import { fetchRecentIcsrEvents, fmtDateTime } from "@/lib/icsr-queries";

export const Route = createFileRoute("/crm/icsr/activity")({
  head: () => ({
    meta: [
      { title: "ICSR Activity Log | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Attributable, chronological audit trail of every pharmacovigilance case action — intake, triage, duplicate decisions, follow-ups and submissions.",
      },
      { property: "og:title", content: "ICSR Activity Log | MedNovaOS Pharmacovigilance" },
      { property: "og:description", content: "Chronological audit trail of every ICSR case action." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IcsrActivityPage,
});

function IcsrActivityPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["icsr-activity-all"],
    queryFn: () => fetchRecentIcsrEvents(500),
  });

  const types = useMemo(
    () => [...new Set((events ?? []).map((e) => e.event_type))].sort(),
    [events],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (events ?? []).filter((e) => {
      if (type && e.event_type !== type) return false;
      if (!q) return true;
      return [e.message, e.event_type, e.actor, e.icsr_cases?.case_ref]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [events, search, type]);

  return (
    <CrmShell>
      <CrmHeader
        title="ICSR activity"
        subtitle="Every action taken against every case, in sequence and attributable to a person. This is the audit trail an inspector asks to see."
        actions={
          <>
            <Link to="/crm/icsr/performance" className={btnGhost}>
              Performance
            </Link>
            <Link to="/crm/icsr" className={btnGhost}>
              Back to register
            </Link>
          </>
        }
      />

      <div className="px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            className={`${inputClass} max-w-sm`}
            placeholder="Search case ID, action, user or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={`${inputClass} max-w-[220px]`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All action types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} entries</span>
        </div>

        <CrmCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  {["When", "Case", "Action", "Detail", "User"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No activity matches this filter.
                    </td>
                  </tr>
                )}
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {fmtDateTime(e.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {e.case_id ? (
                        <Link
                          to="/crm/icsr/$id"
                          params={{ id: e.case_id }}
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          {e.icsr_cases?.case_ref ?? "View"}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">{e.event_type}</td>
                    <td className="px-4 py-3 text-foreground">{e.message}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{e.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrmCard>
      </div>
    </CrmShell>
  );
}
