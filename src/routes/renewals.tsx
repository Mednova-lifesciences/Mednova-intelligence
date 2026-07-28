import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card, PageTitle, dash } from "@/components/mednova/AppShell";
import { fetchRenewals } from "@/lib/mednova-queries";

export const Route = createFileRoute("/renewals")({
  head: () => ({
    meta: [
      { title: "Renewal Watch | MedNova OS" },
      {
        name: "description",
        content:
          "Track NAFDAC registrations approaching expiry within the next 3, 6, 12 or 24 months.",
      },
      { property: "og:title", content: "Renewal Watch | MedNova OS" },
      {
        property: "og:description",
        content: "NAFDAC registrations approaching expiry, ordered by renewal urgency.",
      },
    ],
  }),
  component: Renewals,
});

function Renewals() {
  const [draft, setDraft] = useState(12);
  const [months, setMonths] = useState(12);
  const { data, isLoading } = useQuery({
    queryKey: ["renewals", months],
    queryFn: () => fetchRenewals(months),
  });

  return (
    <AppShell>
      <PageTitle>Renewal Watch</PageTitle>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
        >
          <option value={3}>Next 3 months</option>
          <option value={6}>Next 6 months</option>
          <option value={12}>Next 12 months</option>
          <option value={24}>Next 24 months</option>
        </select>
        <button
          onClick={() => setMonths(draft)}
          className="h-10 rounded-md bg-navy px-5 text-sm font-semibold text-navy-foreground hover:opacity-90"
        >
          Update
        </button>
      </div>

      <Card className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {["Product", "NAFDAC No.", "Category", "Applicant", "Expiry", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={6} className="px-3 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {data?.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{dash(r.product_name)}</td>
                  <td className="px-3 py-3">{dash(r.nafdac_number)}</td>
                  <td className="px-3 py-3">{dash(r.category)}</td>
                  <td className="px-3 py-3">{dash(r.applicant)}</td>
                  <td className="px-3 py-3">{dash(r.expiry_date)}</td>
                  <td className="px-3 py-3">{dash(r.status)}</td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                    Nothing expiring in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
