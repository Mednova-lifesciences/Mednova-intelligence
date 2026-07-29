import { supabase } from "@/integrations/supabase/client";
import { GAP_ITEMS, GAP_DOMAINS, type GapItem } from "./gap-items";

/* ------------------------------------------------------------------ *
 * Scales and vocabularies — verbatim from the assessment specification
 * ------------------------------------------------------------------ */

export const SCALE = ["Absent", "Ad hoc", "Defined", "Implemented", "Verified"] as const;

export const SCALE_LONG = [
  "No process exists.",
  "Happens inconsistently, depends on individuals, not recorded.",
  "Defined and understood in practice, but not documented or not consistently followed.",
  "Documented, controlled, consistently applied, with retrievable records.",
  "As implemented, plus objective evidence it has been checked and shown effective.",
] as const;

export const RISKS = [
  ["Critical", "r1"],
  ["Major", "r2"],
  ["Minor", "r3"],
  ["No gap", "r4"],
] as const;

export const EVIDENCE_OPTIONS = ["Yes", "Partial", "No", "N/A"] as const;
export const ACTION_STATUSES = ["Open", "In progress", "Complete", "N/A"] as const;

export const FILTERS = [
  { key: "all", label: `All ${GAP_ITEMS.length}` },
  { key: "todo", label: "Not yet scored" },
  { key: "gap", label: "Gaps" },
  { key: "risk", label: "Critical & major" },
] as const;

export type GapFilter = (typeof FILTERS)[number]["key"];

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type GapAssessment = {
  id: string;
  title: string;
  client: string;
  assessor: string;
  assessment_date: string | null;
  created_at: string;
  updated_at: string;
};

export type GapRow = {
  ev: string;
  cur: number | null;
  tgt: number;
  risk: string;
  finding: string;
  action: string;
  owner: string;
  due: string;
  status: string;
};

export type GapRows = Record<string, GapRow>;

export const emptyRow = (): GapRow => ({
  ev: "",
  cur: null,
  tgt: 3,
  risk: "",
  finding: "",
  action: "",
  owner: "",
  due: "",
  status: "Open",
});

export function blankRows(): GapRows {
  const rows: GapRows = {};
  GAP_ITEMS.forEach((i) => {
    rows[i.ref] = emptyRow();
  });
  return rows;
}

/* ------------------------------------------------------------------ *
 * Consulting maths — identical to the specification
 * ------------------------------------------------------------------ */

export type GapStats = { n: number; scored: number; avg: number | null; tgt: number };

export function statsFor(list: GapItem[], rows: GapRows): GapStats {
  const scored = list.filter((i) => rows[i.ref]?.cur !== null && rows[i.ref]?.cur !== undefined);
  const avg = scored.length
    ? scored.reduce((a, i) => a + (rows[i.ref].cur as number), 0) / scored.length
    : null;
  const tgt = list.length ? list.reduce((a, i) => a + (rows[i.ref]?.tgt ?? 3), 0) / list.length : 3;
  return { n: list.length, scored: scored.length, avg, tgt };
}

export const readinessPct = (avg: number | null) => (avg === null ? null : Math.round((avg / 4) * 100));

export function riskCount(list: GapItem[], rows: GapRows, risk: string) {
  return list.filter((i) => rows[i.ref]?.risk === risk).length;
}

/** A gap exists once a requirement is scored below its target maturity. */
export function isGap(row: GapRow | undefined) {
  return !!row && row.cur !== null && row.cur < (row.tgt ?? 3);
}

/** Numeric gap size used in the CSV export. */
export function gapSize(row: GapRow) {
  return row.cur === null ? "" : Math.max(0, (row.tgt ?? 3) - row.cur);
}

export function itemsOfDomain(domain: string) {
  return GAP_ITEMS.filter((i) => i.d === domain);
}

export function matchesFilter(row: GapRow, filter: GapFilter) {
  if (filter === "todo") return row.cur === null;
  if (filter === "gap") return isGap(row);
  if (filter === "risk") return row.risk === "Critical" || row.risk === "Major";
  return true;
}

/** Gauge geometry: fill percentage plus the band the score falls in. */
export function gaugeOf(avg: number | null, tgt: number) {
  const pct = avg === null ? 0 : (avg / 4) * 100;
  const band = avg === null ? "none" : pct < 40 ? "lo" : pct < 65 ? "md" : "hi";
  return { pct, band, targetPct: (tgt / 4) * 100, showTarget: avg !== null };
}

/* ------------------------------------------------------------------ *
 * Persistence — Supabase replaces the prototype's browser storage
 * ------------------------------------------------------------------ */

export async function fetchAssessments(search = "") {
  let q = supabase.from("gap_assessments").select("*").order("updated_at", { ascending: false });
  if (search.trim()) q = q.or(`title.ilike.%${search}%,client.ilike.%${search}%,assessor.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GapAssessment[];
}

export async function fetchAssessment(id: string) {
  const { data, error } = await supabase.from("gap_assessments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as GapAssessment | null;
}

export async function fetchRows(assessmentId: string): Promise<GapRows> {
  const { data, error } = await supabase.from("gap_responses").select("*").eq("assessment_id", assessmentId);
  if (error) throw error;
  const rows = blankRows();
  (data ?? []).forEach((r) => {
    if (!rows[r.ref]) return;
    rows[r.ref] = {
      ev: r.evidence ?? "",
      cur: r.current_maturity === null || r.current_maturity === undefined ? null : Number(r.current_maturity),
      tgt: r.target_maturity ?? 3,
      risk: r.risk ?? "",
      finding: r.finding ?? "",
      action: r.action ?? "",
      owner: r.owner ?? "",
      due: r.due_date ?? "",
      status: r.status ?? "Open",
    };
  });
  return rows;
}

export async function createAssessment(input: Partial<GapAssessment>) {
  const { data, error } = await supabase
    .from("gap_assessments")
    .insert({
      title: input.title?.trim() || "Untitled assessment",
      client: input.client ?? "",
      assessor: input.assessor ?? "",
      assessment_date: input.assessment_date || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as GapAssessment;
}

export async function updateAssessmentMeta(id: string, patch: Partial<GapAssessment>) {
  const { error } = await supabase.from("gap_assessments").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAssessment(id: string) {
  const { error } = await supabase.from("gap_assessments").delete().eq("id", id);
  if (error) throw error;
}

/** Upsert one requirement's response. Called by the debounced autosave. */
export async function saveRow(assessmentId: string, ref: string, row: GapRow) {
  const { error } = await supabase.from("gap_responses").upsert(
    {
      assessment_id: assessmentId,
      ref,
      evidence: row.ev,
      current_maturity: row.cur,
      target_maturity: row.tgt,
      risk: row.risk,
      finding: row.finding,
      action: row.action,
      owner: row.owner,
      due_date: row.due || null,
      status: row.status,
    },
    { onConflict: "assessment_id,ref" },
  );
  if (error) throw error;
}

/** Bulk replace — used when importing a saved assessment file. */
export async function saveAllRows(assessmentId: string, rows: GapRows) {
  const payload = GAP_ITEMS.map((i) => {
    const row = rows[i.ref] ?? emptyRow();
    return {
      assessment_id: assessmentId,
      ref: i.ref,
      evidence: row.ev,
      current_maturity: row.cur,
      target_maturity: row.tgt,
      risk: row.risk,
      finding: row.finding,
      action: row.action,
      owner: row.owner,
      due_date: row.due || null,
      status: row.status,
    };
  });
  const { error } = await supabase.from("gap_responses").upsert(payload, { onConflict: "assessment_id,ref" });
  if (error) throw error;
}

/* ------------------------------------------------------------------ *
 * Exports
 * ------------------------------------------------------------------ */

export const CSV_HEADER = [
  "Ref",
  "Domain",
  "Requirement",
  "Regulatory reference",
  "Evidence required",
  "Evidence sighted",
  "Current",
  "Target",
  "Gap",
  "Risk",
  "Finding",
  "Recommended action",
  "Owner",
  "Target date",
  "Status",
];

export function toCsv(rows: GapRows) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [CSV_HEADER.map(q).join(",")];
  GAP_ITEMS.forEach((i) => {
    const r = rows[i.ref] ?? emptyRow();
    lines.push(
      [
        i.ref,
        i.d,
        i.req,
        i.reg,
        i.ev,
        r.ev,
        r.cur === null ? "" : r.cur,
        r.tgt,
        gapSize(r),
        r.risk,
        r.finding,
        r.action,
        r.owner,
        r.due,
        r.status,
      ]
        .map(q)
        .join(","),
    );
  });
  return "\ufeff" + lines.join("\r\n");
}

export function fileStamp(client: string) {
  return (client || "assessment").replace(/[^\w-]+/g, "_");
}

export function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export type GapFile = {
  meta: { client: string; assessor: string; date: string };
  rows: GapRows;
};

export function toFile(meta: GapFile["meta"], rows: GapRows): GapFile {
  return { meta, rows };
}

/** Merge an imported file over the current rows, ignoring unknown refs. */
export function mergeFile(current: GapRows, incoming: unknown) {
  const data = incoming as Partial<GapFile> | null;
  const rows: GapRows = { ...current };
  if (data?.rows) {
    for (const k in data.rows) {
      if (rows[k]) rows[k] = { ...rows[k], ...data.rows[k] };
    }
  }
  return { rows, meta: data?.meta };
}

export { GAP_ITEMS, GAP_DOMAINS };
export type { GapItem };
