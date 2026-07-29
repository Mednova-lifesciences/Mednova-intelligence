import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, CrmCard } from "@/components/crm/CrmShell";
import { fetchCompanies, fetchContacts, fetchTasks, fetchEmails } from "@/lib/crm-queries";
import { supabase } from "@/integrations/supabase/client";
import { fetchCases } from "@/lib/icsr-queries";


export const Route = createFileRoute("/crm/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({
    meta: [
      { title: "Search | MedNovaOS CRM" },
      { name: "description", content: "Global search across CRM companies, contacts, products, emails, tasks and deals." },
      { property: "og:title", content: "Search | MedNovaOS CRM" },
      { property: "og:description", content: "Global CRM search across every record type." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

async function globalSearch(q: string) {
  if (!q.trim()) return { companies: [], contacts: [], tasks: [], emails: [], products: [], cases: [] };
  const like = `%${q}%`;
  const [companies, contacts, tasks, emails, products, cases] = await Promise.all([
    fetchCompanies({ search: q }),
    fetchContacts({ search: q }),
    fetchTasks(),
    fetchEmails(),
    supabase.from("products").select("id, product_name, manufacturer").ilike("product_name", like).limit(15),
    fetchCases({ search: q }),
  ]);
  return {
    companies,
    contacts,
    tasks: tasks.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())),
    emails: (emails as { id: string; subject: string | null }[]).filter((e) =>
      (e.subject ?? "").toLowerCase().includes(q.toLowerCase()),
    ),
    products: products.data ?? [],
    cases: cases.slice(0, 25),
  };
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <CrmCard>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="mt-3 divide-y divide-border text-sm">{children}</div>
    </CrmCard>
  );
}

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useQuery({ queryKey: ["crm-search", q], queryFn: () => globalSearch(q) });

  return (
    <CrmShell>
      <CrmHeader title="Search" subtitle={q ? `Results for “${q}”` : "Type a query in the top search bar"} />
      <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
        <Section title={`Companies (${data?.companies.length ?? 0})`}>
          {(data?.companies ?? []).map((c) => (
            <Link key={c.id} to="/crm/companies/$id" params={{ id: c.id }} className="block py-2 hover:text-brand">
              {c.name}
            </Link>
          ))}
        </Section>
        <Section title={`Contacts (${data?.contacts.length ?? 0})`}>
          {(data?.contacts ?? []).map((c) => (
            <div key={c.id} className="py-2">
              {c.name} · {c.email ?? "—"}
            </div>
          ))}
        </Section>
        <Section title={`Products (${data?.products.length ?? 0})`}>
          {(data?.products ?? []).map((p) => (
            <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="block py-2 hover:text-brand">
              {p.product_name}
            </Link>
          ))}
        </Section>
        <Section title={`Tasks (${data?.tasks.length ?? 0})`}>
          {(data?.tasks ?? []).map((t) => (
            <div key={t.id} className="py-2">
              {t.title}
            </div>
          ))}
        </Section>
        <Section title={`Emails (${data?.emails.length ?? 0})`}>
          {(data?.emails ?? []).map((e) => (
            <div key={e.id} className="py-2">
              {e.subject}
            </div>
          ))}
        </Section>
        <Section title={`ICSR cases (${data?.cases.length ?? 0})`}>
          {(data?.cases ?? []).map((c) => (
            <Link key={c.id} to="/crm/icsr/$id" params={{ id: c.id }} className="block py-2 hover:text-brand">
              {c.case_ref} · {c.product ?? "—"} · {c.patient_initials ?? "—"} · {c.seriousness ?? "—"} · {c.status}
            </Link>
          ))}
        </Section>
        <Section title="Reports">
          <p className="py-2 text-muted-foreground">Report search will be available with AI reports.</p>
        </Section>

      </div>
    </CrmShell>
  );
}
