import { Link } from "@tanstack/react-router";
import logo from "@/assets/mednova-logo.png.asset.json";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/products", label: "Products" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/renewals", label: "Renewals" },
  { to: "/crm", label: "CRM" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-navy text-navy-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-4">
          <div>
            <img
              src={logo.url}
              alt="MedNova Lifesciences logo"
              className="h-8 w-auto brightness-0 invert"
            />
            <div className="text-xs font-semibold text-navy-muted">
              NAFDAC Intelligence &amp; Revenue Engine
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-navy-foreground/90 transition-colors hover:text-navy-foreground"
                activeProps={{ className: "text-navy-foreground font-semibold" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="px-8 py-8">{children}</main>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-4xl font-bold tracking-tight text-foreground">{children}</h1>;
}

export const dash = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

export const naira = (v: number) =>
  "₦" + Math.round(v).toLocaleString("en-NG");
