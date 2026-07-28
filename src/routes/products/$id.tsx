import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Card, PageTitle, dash } from "@/components/mednova/AppShell";
import { fetchProduct } from "@/lib/mednova-queries";

export const Route = createFileRoute("/products/$id")({
  head: () => ({
    meta: [
      { title: "Product Details | MedNova OS" },
      {
        name: "description",
        content:
          "Full NAFDAC registration record: category, applicant, manufacturer, strength, composition, approval and expiry dates.",
      },
      { property: "og:title", content: "Product Details | MedNova OS" },
      {
        property: "og:description",
        content: "Full NAFDAC registration record for a MedNova tracked product.",
      },
    ],
  }),
  component: ProductDetail,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ProductDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <Card className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Card>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageTitle>Product not found</PageTitle>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle>{data.product_name}</PageTitle>
      <Card className="mt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Category" value={dash(data.category)} />
          <Field label="NAFDAC number" value={dash(data.nafdac_number)} />
          <Field label="Applicant" value={dash(data.applicant)} />
          <Field label="Manufacturer" value={dash(data.manufacturer)} />
          <Field label="Dosage form" value={dash(data.dosage_form)} />
          <Field label="Route" value={dash(data.route)} />
          <Field label="Strength" value={dash(data.strength)} />
          <Field label="Approval date" value={dash(data.approval_date)} />
          <Field label="Expiry date" value={dash(data.expiry_date)} />
          <Field label="Status" value={dash(data.status)} />
          <Field label="Pack size" value={dash(data.pack_size)} />
          <Field label="Composition" value={dash(data.composition)} />
        </div>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">Last synced: {data.last_synced}</p>
    </AppShell>
  );
}
