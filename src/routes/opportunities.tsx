import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Card, PageTitle, dash, naira } from "@/components/mednova/AppShell";
import { fetchOpportunities } from "@/lib/mednova-queries";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Revenue Opportunities | MedNova OS" },
      {
        name: "description",
        content:
          "Commercial opportunities generated automatically from NAFDAC Green Book registrations, scored by value and priority.",
      },
      { property: "og:title", content: "Revenue Opportunities | MedNova OS" },
      {
        property: "og:description",
        content: "Auto-generated commercial opportunities scored by pipeline value and priority.",
      },
    ],
  }),
  component: Opportunities,
});

function Opportunities() {
  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", "all"],
    queryFn: () => fetchOpportunities(),
  });

  const total = (data ?? []).reduce((sum, o) => sum + Number(o.estimated_value), 0);

  return (
    <AppShell>
      <PageTitle>Revenue Opportunities</PageTitle>
      <p className="mt-2 text-muted-foreground">
        Opportunities generated from Green Book registrations, scored by estimated value.
      </p>

      <Card className="mt-6">
        <h2 className="text-2xl font-bold text-foreground">
          {isLoading ? "Loading opportunities…" : `${data?.length} opportunities · ${naira(total)}`}
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {["Company", "Category", "Products", "Value", "Services", "Priority", "Probability", "Status"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={8} className="px-3 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {data?.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{dash(o.company)}</td>
                  <td className="px-3 py-3">{dash(o.category)}</td>
                  <td className="px-3 py-3">{o.product_count}</td>
                  <td className="px-3 py-3">{naira(Number(o.estimated_value))}</td>
                  <td className="px-3 py-3">{dash(o.services)}</td>
                  <td className="px-3 py-3">{dash(o.priority)}</td>
                  <td className="px-3 py-3">{o.probability}%</td>
                  <td className="px-3 py-3">{dash(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
