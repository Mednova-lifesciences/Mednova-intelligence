import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrmShell, CrmHeader, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import { fetchContacts } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts | MedNovaOS CRM" },
      { name: "description", content: "Every contact across all CRM companies, with role, email, phone and source." },
      { property: "og:title", content: "Contacts | MedNovaOS CRM" },
      { property: "og:description", content: "All CRM contacts across every company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const { data } = useQuery({
    queryKey: ["crm-contacts", search, sort],
    queryFn: () => fetchContacts({ search, sort }),
  });
  const rows = data ?? [];

  return (
    <CrmShell>
      <CrmHeader
        title="Contacts"
        subtitle={`${rows.length} contacts across the CRM`}
        actions={
          <>
            <Link to="/crm/companies" className={btnGhost}>
              Discover contacts
            </Link>
            <Link to="/crm/companies" className={btnPrimary}>
              Add contact
            </Link>
          </>
        }
      />
      <div className="px-8 py-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="Search name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={`${inputClass} max-w-[200px]`} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">LinkedIn</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No contacts yet. Discover contacts from a company profile.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.companies?.name ?? "—"}</td>
                  <td className="px-4 py-3">{c.department ?? c.role ?? "—"}</td>
                  <td className="px-4 py-3">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">{c.phone ?? "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-brand">{c.linkedin ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
