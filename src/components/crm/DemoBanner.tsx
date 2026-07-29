export function DemoBanner() {
  return (
    <div
      className="border-b border-border/40 bg-navy px-8 py-3 font-mono text-[11.5px] leading-relaxed"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, color-mix(in oklab, var(--navy-foreground) 4%, transparent) 0 10px, transparent 10px 20px)",
      }}
      role="note"
    >
      <p className="font-bold uppercase tracking-[0.08em] text-navy-foreground">
        Demonstration system — not validated.{" "}
        <span className="text-amber-400">Do not enter real patient or reporter data.</span>
      </p>
      <p className="mt-1 text-navy-muted">
        Built to show how intake, duplicate detection and timeliness tracking would work. A production system
        requires validation, authenticated access, an immutable audit trail, backup and retention controls before any
        live case is entered.
      </p>
    </div>
  );
}
