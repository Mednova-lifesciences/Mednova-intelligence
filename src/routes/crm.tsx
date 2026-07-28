import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, PageTitle } from "@/components/mednova/AppShell";

export const Route = createFileRoute("/crm")({
  head: () => ({
    meta: [
      { title: "CRM | MedNova OS" },
      {
        name: "description",
        content: "CRM workspace placeholder inside MedNova OS — not yet implemented.",
      },
      { property: "og:title", content: "CRM | MedNova OS" },
      { property: "og:description", content: "CRM workspace placeholder inside MedNova OS." },
    ],
  }),
  component: Crm,
});

function Crm() {
  return (
    <AppShell>
      <PageTitle>CRM</PageTitle>
      <Card className="mt-6">
        <p className="text-muted-foreground">This module is not implemented yet.</p>
      </Card>
    </AppShell>
  );
}
