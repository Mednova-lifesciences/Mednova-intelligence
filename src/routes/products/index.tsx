import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card, PageTitle, dash } from "@/components/mednova/AppShell";
import { fetchProducts, type ProductFilters } from "@/lib/mednova-queries";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Product Intelligence | MedNova OS" },
      {
        name: "description",
        content:
          "Search every NAFDAC registered product by manufacturer, applicant, category, status and expiry window.",
      },
      { property: "og:title", content: "Product Intelligence | MedNova OS" },
      {
        property: "og:description",
        content: "Search NAFDAC registered products by manufacturer, applicant, category and expiry.",
      },
    ],
  }),
  component: Products,
});

const CATEGORIES = [
  "Drugs",
  "Medical devices",
  "Herbals and Nutraceuticals",
  "Vaccines and Biologics",
  "Veterinary",
  "N/A",
];

const inputCls =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground";

function Products() {
  const [draft, setDraft] = useState<ProductFilters>({
    search: "",
    manufacturer: "",
    applicant: "",
    category: "",
    status: "",
    expiry: "",
    sort: "newest",
    pageSize: 50,
    page: 1,
  });
  const [filters, setFilters] = useState<ProductFilters>(draft);

  const { data, isLoading } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
  });

  const set = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const totalPages = data ? Math.max(1, Math.ceil(data.count / filters.pageSize)) : 1;

  return (
    <AppShell>
      <PageTitle>Product Intelligence</PageTitle>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          className={`${inputCls} min-w-[320px] flex-1`}
          placeholder="Product, manufacturer, applicant, registration number"
          value={draft.search}
          onChange={(e) => set("search", e.target.value)}
        />
        <input
          className={`${inputCls} min-w-[280px]`}
          placeholder="Manufacturer"
          value={draft.manufacturer}
          onChange={(e) => set("manufacturer", e.target.value)}
        />
        <input
          className={`${inputCls} min-w-[280px]`}
          placeholder="Applicant"
          value={draft.applicant}
          onChange={(e) => set("applicant", e.target.value)}
        />
        <select
          className={inputCls}
          value={draft.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={draft.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          className={inputCls}
          value={draft.expiry}
          onChange={(e) => set("expiry", e.target.value)}
        >
          <option value="">Any expiry</option>
          <option value="3">Next 3 months</option>
          <option value="6">Next 6 months</option>
          <option value="12">Next 12 months</option>
          <option value="24">Next 24 months</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <select className={inputCls} value={draft.sort} onChange={(e) => set("sort", e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="expiry">Expiry</option>
          <option value="name">Name</option>
        </select>
        <input
          type="number"
          min={10}
          max={200}
          className={`${inputCls} w-[320px]`}
          value={draft.pageSize}
          onChange={(e) => set("pageSize", Number(e.target.value) || 50)}
        />
        <button
          onClick={() => setFilters({ ...draft, page: 1 })}
          className="h-10 rounded-md bg-navy px-5 text-sm font-semibold text-navy-foreground hover:opacity-90"
        >
          Search
        </button>
      </div>

      <Card className="mt-6">
        <h2 className="text-2xl font-bold text-foreground">
          {isLoading ? "Loading products…" : `${data?.count.toLocaleString()} products`}
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {[
                  "Product",
                  "Manufacturer",
                  "Applicant",
                  "Category",
                  "Dosage Form",
                  "Route",
                  "NAFDAC No.",
                  "Registration Date",
                  "Approval",
                  "Expiry",
                  "Status",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={11} className="px-3 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {data?.rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-3 py-3">
                    <Link
                      to="/products/$id"
                      params={{ id: p.id }}
                      className="text-primary underline underline-offset-2"
                    >
                      {p.product_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{dash(p.manufacturer)}</td>
                  <td className="px-3 py-3">{dash(p.applicant)}</td>
                  <td className="px-3 py-3">{dash(p.category)}</td>
                  <td className="px-3 py-3">{dash(p.dosage_form)}</td>
                  <td className="px-3 py-3">{dash(p.route)}</td>
                  <td className="px-3 py-3">{dash(p.nafdac_number)}</td>
                  <td className="px-3 py-3">{dash(p.registration_date)}</td>
                  <td className="px-3 py-3">{dash(p.approval_date)}</td>
                  <td className="px-3 py-3">{dash(p.expiry_date)}</td>
                  <td className="px-3 py-3">{dash(p.status)}</td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-muted-foreground">
                    No products match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted-foreground">
            Page {filters.page} of {totalPages}
          </span>
          <button
            disabled={filters.page >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Card>
    </AppShell>
  );
}
