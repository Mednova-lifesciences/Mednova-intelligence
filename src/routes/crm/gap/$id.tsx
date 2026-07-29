import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileJson, FolderOpen, Printer, Check } from "lucide-react";
import { CrmShell, btnGhost, btnPrimary } from "@/components/crm/CrmShell";
import {
  ACTION_STATUSES,
  EVIDENCE_OPTIONS,
  FILTERS,
  GAP_DOMAINS,
  GAP_ITEMS,
  RISKS,
  SCALE,
  SCALE_LONG,
  blankRows,
  download,
  fetchAssessment,
  fetchRows,
  fileStamp,
  gaugeOf,
  isGap,
  itemsOfDomain,
  matchesFilter,
  mergeFile,
  readinessPct,
  riskCount,
  saveAllRows,
  saveRow,
  statsFor,
  toCsv,
  toFile,
  updateAssessmentMeta,
  type GapFilter,
  type GapItem,
  type GapRow,
  type GapRows,
} from "@/lib/gap-queries";

export const Route = createFileRoute("/crm/gap/$id")({
  head: () => ({
    meta: [
      { title: "Gap Assessment Workbench | MedNovaOS Pharmacovigilance" },
      {
        name: "description",
        content:
          "Score 57 pharmacovigilance quality system requirements for maturity, capture findings and CAPA, and track readiness against target.",
      },
      { property: "og:title", content: "Gap Assessment Workbench | MedNovaOS Pharmacovigilance" },
      {
        property: "og:description",
        content: "Score PV quality system maturity, capture findings and CAPA, and track inspection readiness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <CrmShell>
      <div role="alert" className="px-8 py-10 text-sm text-destructive">
        {error.message}
      </div>
    </CrmShell>
  ),
  notFoundComponent: () => (
    <CrmShell>
      <div className="px-8 py-10 text-sm text-muted-foreground">That assessment no longer exists.</div>
    </CrmShell>
  ),
  component: GapWorkbench,
});

/* ------------------------------------------------------------------ */

function Gauge({
  avg,
  tgt,
  big,
}: {
  avg: number | null;
  tgt: number;
  big?: boolean;
}) {
  const g = gaugeOf(avg, tgt);
  const fill = g.band === "lo" ? "bg-destructive" : g.band === "md" ? "bg-amber-500" : "bg-brand";
  return (
    <span className={`relative block w-full overflow-hidden rounded-sm bg-muted ${big ? "h-[22px]" : "h-3"}`}>
      <span
        className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${fill}`}
        style={{ width: `${g.pct}%` }}
      />
      {[25, 50, 75].map((n) => (
        <span key={n} className="absolute inset-y-0 w-0.5 bg-card" style={{ left: `${n}%` }} />
      ))}
      {g.showTarget && (
        <span className="absolute -inset-y-0.5 w-0.5 bg-navy" style={{ left: `${g.targetPct}%` }} />
      )}
    </span>
  );
}

const labelClass =
  "mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";
const fieldClass =
  "w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-brand";

function OptButton({
  on,
  wide,
  tone,
  onClick,
  children,
}: {
  on: boolean;
  wide?: boolean;
  tone?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active =
    tone === "r1"
      ? "bg-destructive border-destructive text-destructive-foreground"
      : tone === "r2"
        ? "bg-amber-500 border-amber-500 text-white"
        : tone === "r3"
          ? "bg-moss border-moss text-white"
          : "bg-navy border-navy text-navy-foreground";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1.5 font-semibold transition-colors ${
        wide ? "text-[11.5px]" : "min-w-[31px] font-mono text-xs"
      } ${on ? active : "border-border bg-card text-moss hover:border-moss"}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */

function GapWorkbench() {
  const { id } = Route.useParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: assessment } = useQuery({ queryKey: ["gap-assessment", id], queryFn: () => fetchAssessment(id) });
  const { data: loadedRows } = useQuery({ queryKey: ["gap-rows", id], queryFn: () => fetchRows(id) });

  const [rows, setRows] = useState<GapRows>(() => blankRows());
  const [meta, setMeta] = useState({ client: "", assessor: "", date: "" });
  const [filter, setFilter] = useState<GapFilter>("all");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loadedRows) setRows(loadedRows);
  }, [loadedRows]);

  useEffect(() => {
    if (assessment)
      setMeta({
        client: assessment.client ?? "",
        assessor: assessment.assessor ?? "",
        date: assessment.assessment_date ?? "",
      });
  }, [assessment]);

  /* --- debounced autosave, mirroring the prototype's 400ms persist --- */
  const rowTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, []);

  const persistRow = useCallback(
    (ref: string, row: GapRow) => {
      clearTimeout(rowTimers.current[ref]);
      rowTimers.current[ref] = setTimeout(() => {
        saveRow(id, ref, row).then(flash).catch(console.error);
      }, 400);
    },
    [id, flash],
  );

  const patchRow = useCallback(
    (ref: string, patch: Partial<GapRow>) => {
      setRows((prev) => {
        const next = { ...prev[ref], ...patch };
        // Scoring at or above target with no risk yet recorded closes the gap.
        if (patch.cur !== undefined && patch.cur !== null && patch.cur >= (next.tgt ?? 3) && !next.risk) {
          next.risk = "No gap";
        }
        persistRow(ref, next);
        return { ...prev, [ref]: next };
      });
    },
    [persistRow],
  );

  const patchMeta = useCallback(
    (patch: Partial<typeof meta>) => {
      setMeta((prev) => {
        const next = { ...prev, ...patch };
        if (metaTimer.current) clearTimeout(metaTimer.current);
        metaTimer.current = setTimeout(() => {
          updateAssessmentMeta(id, {
            client: next.client,
            assessor: next.assessor,
            assessment_date: next.date || null,
          })
            .then(flash)
            .catch(console.error);
        }, 400);
        return next;
      });
    },
    [id, flash],
  );

  /* --- derived consulting maths --- */
  const overall = useMemo(() => statsFor(GAP_ITEMS, rows), [rows]);
  const rc = useMemo(
    () => ["Critical", "Major", "Minor"].map((r) => riskCount(GAP_ITEMS, rows, r)),
    [rows],
  );
  const pct = readinessPct(overall.avg);

  const visibleByDomain = useMemo(
    () =>
      GAP_DOMAINS.map((d) => ({
        domain: d,
        stats: statsFor(itemsOfDomain(d), rows),
        items: itemsOfDomain(d).filter((i) => matchesFilter(rows[i.ref], filter)),
      })),
    [rows, filter],
  );
  const shown = visibleByDomain.reduce((a, d) => a + d.items.length, 0);

  /* --- exports --- */
  const stamp = fileStamp(meta.client);
  const exportCsv = () => download(`PV_gap_assessment_${stamp}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  const exportJson = () =>
    download(
      `PV_gap_assessment_${stamp}.json`,
      JSON.stringify(toFile(meta, rows), null, 2),
      "application/json",
    );
  const onImport = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const merged = mergeFile(rows, JSON.parse(String(rd.result)));
        setRows(merged.rows);
        saveAllRows(id, merged.rows).then(flash).catch(console.error);
        if (merged.meta) patchMeta(merged.meta);
      } catch {
        alert("That file could not be read as a saved assessment. Choose a JSON file saved from this tool.");
      }
    };
    rd.readAsText(file);
  };

  const printLine = `${meta.client || "[entity]"}  ·  assessed by ${meta.assessor || "[assessor]"}  ·  ${
    meta.date || "[date]"
  }  ·  ${overall.scored} of ${GAP_ITEMS.length} requirements scored  ·  ${
    overall.avg === null ? "not yet scored" : `${pct}% readiness (${overall.avg.toFixed(2)} of 4.00)`
  }  ·  ${rc[0]} critical, ${rc[1]} major, ${rc[2]} minor`;

  return (
    <CrmShell>
      {/* meta bar */}
      <div className="gap-noprint sticky top-0 z-20 border-b-[3px] border-brand bg-navy px-8 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-base font-extrabold leading-tight tracking-tight text-navy-foreground">
              {assessment?.title ?? "Gap Assessment"}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-navy-muted">
              PV Quality System
            </div>
          </div>
          <div className="flex min-w-[220px] flex-1 flex-wrap gap-2">
            <input
              className="min-w-[120px] flex-1 rounded-sm border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12.5px] text-navy-foreground outline-none placeholder:text-navy-muted focus:border-brand"
              placeholder="Client / entity assessed"
              value={meta.client}
              onChange={(e) => patchMeta({ client: e.target.value })}
            />
            <input
              className="min-w-[120px] flex-1 rounded-sm border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12.5px] text-navy-foreground outline-none placeholder:text-navy-muted focus:border-brand"
              placeholder="Assessor"
              value={meta.assessor}
              onChange={(e) => patchMeta({ assessor: e.target.value })}
            />
            <input
              type="date"
              className="min-w-[120px] rounded-sm border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12.5px] text-navy-foreground outline-none focus:border-brand"
              value={meta.date}
              onChange={(e) => patchMeta({ date: e.target.value })}
            />
          </div>
          <div className="whitespace-nowrap font-mono text-[11.5px] text-navy-muted">
            <b className="text-navy-foreground">{overall.scored}</b> of{" "}
            <b className="text-navy-foreground">{GAP_ITEMS.length}</b> scored
            {saved && (
              <span className="ml-3 inline-flex items-center gap-1 text-brand">
                <Check className="h-3 w-3" /> saved
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/crm/gap" className={btnGhost}>
              <ArrowLeft className="h-4 w-4" /> All assessments
            </Link>
            <button className={btnGhost} onClick={() => fileRef.current?.click()}>
              <FolderOpen className="h-4 w-4" /> Open file
            </button>
            <button className={btnGhost} onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button className={btnGhost} onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print findings
            </button>
            <button className={btnPrimary} onClick={exportJson}>
              <FileJson className="h-4 w-4" /> Save file
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />

      <div className="grid items-start lg:grid-cols-[296px_minmax(0,1fr)]">
        {/* rail */}
        <aside className="gap-noprint sticky top-[64px] h-auto border-b border-border bg-card px-4 pb-10 pt-5 lg:h-[calc(100vh-64px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mb-5 rounded border border-border bg-muted/20 p-3.5">
            <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Overall readiness
            </div>
            <div className="mb-2.5 flex items-baseline gap-2 font-mono text-[26px] font-semibold leading-none tracking-tight text-foreground">
              {pct === null ? "—" : `${pct}%`}
              <small className="text-[11px] font-medium text-muted-foreground">
                {overall.avg === null ? "not yet scored" : `${overall.avg.toFixed(2)} of 4.00 average`}
              </small>
            </div>
            <Gauge avg={overall.avg} tgt={overall.tgt} big />
            <div className="mt-3 flex gap-1.5 font-mono text-[10.5px]">
              {[
                { n: rc[0], l: "Critical", on: rc[0] > 0, cls: "bg-destructive/10 text-destructive" },
                { n: rc[1], l: "Major", on: rc[1] > 0, cls: "bg-amber-500/15 text-amber-700" },
                { n: rc[2], l: "Minor", on: false, cls: "" },
              ].map((t) => (
                <span
                  key={t.l}
                  className={`flex-1 rounded-sm px-0.5 py-1.5 text-center ${
                    t.on ? t.cls : "bg-muted text-muted-foreground"
                  }`}
                >
                  <b className="mb-px block text-sm">{t.n}</b>
                  {t.l}
                </span>
              ))}
            </div>
          </div>

          <p className="mb-2.5 border-b border-border pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Maturity by domain
          </p>
          <div className="relative pl-3.5 before:absolute before:bottom-4 before:left-[3px] before:top-1.5 before:w-px before:bg-border">
            {visibleByDomain.map((d, ix) => {
              const complete = d.stats.scored === d.stats.n;
              return (
                <button
                  key={d.domain}
                  onClick={() =>
                    document.getElementById(`gapd${ix}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="group relative block w-full cursor-pointer border-0 bg-transparent px-0 pb-2.5 pt-2 text-left"
                >
                  <span
                    className={`absolute -left-3.5 top-3 h-[7px] w-[7px] rounded-full border-[1.5px] ${
                      complete ? "border-brand bg-brand" : "border-border bg-card"
                    }`}
                  />
                  <span className="mb-1.5 flex justify-between gap-2 text-[11.5px] font-semibold leading-tight text-foreground group-hover:text-brand">
                    <span>{d.domain.replace(/^\d+\.\s*/, "")}</span>
                    <em className="flex-none font-mono text-[10px] not-italic text-muted-foreground">
                      {d.stats.scored}/{d.stats.n}
                    </em>
                  </span>
                  <Gauge avg={d.stats.avg} tgt={d.stats.tgt} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* sheet */}
        <main className="min-w-0 px-6 pb-24 pt-5">
          <div className="gap-printhead mb-3.5 hidden border-b-2 border-foreground pb-2">
            <h1 className="mb-1 text-[15px] font-bold">
              Pharmacovigilance quality system — gap analysis findings
            </h1>
            <p className="font-mono text-[10px] text-muted-foreground">{printLine}</p>
          </div>

          <div className="gap-noprint mb-5 rounded-sm border border-border border-l-[3px] border-l-amber-500 bg-card px-4 py-3 text-[12.5px] leading-relaxed text-moss">
            <b className="text-foreground">Score what is demonstrable today</b> — not what is intended, in draft,
            or believed to be happening. If a process operates reliably but leaves no record, it scores no higher
            than 2. Findings and actions open automatically once a gap exists. Everything is saved to the CRM as
            you type; use <b className="text-foreground">Save file</b> to take a copy with you.
          </div>

          <div className="gap-noprint mb-5 flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-sm border border-border bg-card">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`border-r border-border px-3 py-1.5 text-xs font-semibold last:border-r-0 ${
                    filter === f.key ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{shown ? `${shown} shown` : ""}</span>
          </div>

          {shown === 0 && (
            <div className="rounded-sm border border-border border-l-[3px] border-l-brand bg-card px-4 py-3 text-[12.5px] text-moss">
              <b className="text-foreground">Nothing matches this filter.</b>{" "}
              {filter === "todo"
                ? "Every requirement has been scored."
                : filter === "gap"
                  ? "No scored requirement currently sits below its target."
                  : "No requirement is rated critical or major."}
            </div>
          )}

          {visibleByDomain.map((d, ix) =>
            d.items.length === 0 ? null : (
              <section key={d.domain} id={`gapd${ix}`} className="mb-9 scroll-mt-20">
                <div className="mb-3.5 flex items-end gap-3.5 border-b-2 border-foreground pb-2">
                  <h2 className="m-0 text-[17px] font-bold tracking-tight text-foreground">{d.domain}</h2>
                  <span className="mb-1 max-w-[190px] flex-1">
                    <Gauge avg={d.stats.avg} tgt={d.stats.tgt} />
                  </span>
                </div>
                {d.items.map((item) => (
                  <ItemCard key={item.ref} item={item} row={rows[item.ref]} onPatch={patchRow} />
                ))}
              </section>
            ),
          )}
        </main>
      </div>
    </CrmShell>
  );
}

/* ------------------------------------------------------------------ */

function ItemCard({
  item,
  row,
  onPatch,
}: {
  item: GapItem;
  row: GapRow;
  onPatch: (ref: string, patch: Partial<GapRow>) => void;
}) {
  const gap = isGap(row);
  const edge =
    row.risk === "Critical"
      ? "border-l-[3px] border-l-destructive"
      : gap
        ? "border-l-[3px] border-l-amber-500"
        : row.cur !== null
          ? "border-l-[3px] border-l-brand"
          : "";

  return (
    <article
      className={`mb-3 rounded border border-border bg-card px-4 py-4 ${edge} ${gap ? "" : "gap-hideprint"}`}
    >
      <div className="font-mono text-[10.5px] tracking-wide text-muted-foreground">{item.ref}</div>
      <h3 className="my-1 text-[14.5px] font-semibold leading-snug tracking-tight text-foreground">{item.req}</h3>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-moss">
          {item.reg}
        </span>
      </div>
      <div className="mb-3 border-l-2 border-border pl-2.5 text-[12.5px] leading-snug text-muted-foreground">
        <b className="mb-0.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-moss">
          Evidence required
        </b>
        {item.ev}
      </div>

      <div className="gap-noprint flex flex-wrap items-start gap-4">
        <div className="min-w-0">
          <label className={labelClass}>Evidence sighted</label>
          <div className="flex flex-wrap gap-1">
            {EVIDENCE_OPTIONS.map((v) => (
              <OptButton
                key={v}
                wide
                on={row.ev === v}
                onClick={() => onPatch(item.ref, { ev: row.ev === v ? "" : v })}
              >
                {v}
              </OptButton>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <label className={labelClass}>Current maturity</label>
          <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4].map((v) => (
              <OptButton
                key={v}
                on={row.cur === v}
                onClick={() => onPatch(item.ref, { cur: row.cur === v ? null : v })}
              >
                {v}
              </OptButton>
            ))}
          </div>
          <div className="mt-1.5 min-h-4 text-[11.5px] font-semibold text-brand">
            {row.cur === null ? "" : `${SCALE[row.cur]} — ${SCALE_LONG[row.cur]}`}
          </div>
        </div>

        <div className="min-w-0">
          <label className={labelClass}>Target</label>
          <select
            className={fieldClass}
            value={row.tgt}
            onChange={(e) => onPatch(item.ref, { tgt: Number(e.target.value) })}
          >
            {[0, 1, 2, 3, 4].map((v) => (
              <option key={v} value={v}>
                {v} · {SCALE[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className={labelClass}>Risk rating</label>
          <div className="flex flex-wrap gap-1">
            {RISKS.map(([v, c]) => (
              <OptButton
                key={v}
                wide
                tone={c}
                on={row.risk === v}
                onClick={() => onPatch(item.ref, { risk: row.risk === v ? "" : v })}
              >
                {v}
              </OptButton>
            ))}
          </div>
        </div>
      </div>

      {gap && (
        <div className="mt-3.5 border-t border-dashed border-border pt-3.5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col">
              <label className={labelClass}>Finding — what was actually observed</label>
              <textarea
                className={`${fieldClass} min-h-[58px] leading-snug`}
                value={row.finding}
                onChange={(e) => onPatch(item.ref, { finding: e.target.value })}
              />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Recommended action</label>
              <textarea
                className={`${fieldClass} min-h-[58px] leading-snug`}
                value={row.action}
                onChange={(e) => onPatch(item.ref, { action: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="flex flex-col">
              <label className={labelClass}>Owner</label>
              <input
                className={fieldClass}
                value={row.owner}
                onChange={(e) => onPatch(item.ref, { owner: e.target.value })}
              />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Target date</label>
              <input
                type="date"
                className={fieldClass}
                value={row.due}
                onChange={(e) => onPatch(item.ref, { due: e.target.value })}
              />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Status</label>
              <select
                className={fieldClass}
                value={row.status}
                onChange={(e) => onPatch(item.ref, { status: e.target.value })}
              >
                {ACTION_STATUSES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
