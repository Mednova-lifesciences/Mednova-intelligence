import crypto from "crypto";
import { openaiChatJSON } from "./crm-integrations.server";

const GREENBOOK_URL = "https://greenbook.nafdac.gov.ng/";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export type SyncBatchResult = {
  recordsTotal: number;
  processed: number;
  added: number;
  updated: number;
  unchanged: number;
  nextStart: number;
  done: boolean;
};

/**
 * Processes ONE page of the Green Book catalog and returns immediately.
 * Vercel serverless functions have a hard execution time limit, and the
 * full catalog (~17k products, several DB round-trips each) takes far
 * longer than that to process in one call. The caller is responsible for
 * looping — calling this repeatedly with the returned `nextStart` — until
 * `done` is true.
 */
export async function syncGreenBookBatch(
  supabaseAdmin: any,
  batchId: string,
  start: number,
  length = 200,
): Promise<SyncBatchResult> {
  const seenAt = new Date().toISOString();
  const draw = Math.floor(start / length) + 1;
  const params = new URLSearchParams({
    draw: String(draw),
    start: String(start),
    length: String(length),
  });

  const url = `${GREENBOOK_URL}?${params.toString()}`;
  const maxRetries = 3;
  const perAttemptTimeoutMs = 45_000;
  let lastErr: any = null;
  let json: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Referer: GREENBOOK_URL,
        },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Green Book request failed ${res.status}`);
      json = await res.json();
      lastErr = null;
      break;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        err = new Error(`Green Book request timed out after ${perAttemptTimeoutMs}ms`);
      }
      lastErr = err;
      const cause = err?.cause ? ` (cause: ${err.cause.code ?? err.cause.message ?? err.cause})` : "";
      console.error(
        `[greenbook-sync] fetch attempt ${attempt + 1}/${maxRetries + 1} failed for start=${start}: ${err?.message}${cause}`,
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastErr) {
    const cause = lastErr?.cause ? ` (cause: ${lastErr.cause.code ?? lastErr.cause.message ?? lastErr.cause})` : "";
    throw new Error(`Green Book request failed after ${maxRetries + 1} attempts: ${lastErr?.message}${cause}`);
  }

  const recordsTotal = Number(json.recordsTotal ?? json.recordsFiltered ?? 0) || 0;
  const rows = Array.isArray(json.data) ? json.data : [];

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const r of rows) {
    const rawText = JSON.stringify(r);
    const checksum = sha256(rawText);

    const { error: rawErr } = await supabaseAdmin.from("greenbook_raw").insert({
      nafdac_product_id: r.product_id ?? null,
      nafdac_number: r.NAFDAC ?? null,
      raw_json: r,
      checksum,
      sync_batch_id: batchId,
      first_seen_at: seenAt,
      last_seen_at: seenAt,
    });
    if (rawErr) throw rawErr;

    const { data: prev } = await supabaseAdmin
      .from("greenbook_raw")
      .select("checksum")
      .eq("nafdac_product_id", r.product_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevChecksum = prev?.checksum;
    const isChanged = prevChecksum !== checksum;

    const normalized: any = {
      product_name: (r.product_name ?? "").toString().replaceAll("#", "").replaceAll("*", ""),
      manufacturer: r.manufacturer?.name ?? r.manufacturer_name ?? r.applicant_name ?? null,
      applicant: r.applicant?.name ?? r.applicant_name ?? null,
      category: r.product_category?.name ?? r.category_name ?? null,
      dosage_form: r.form?.name ?? r.form_name ?? null,
      route: r.route?.name ?? r.route_name ?? null,
      nafdac_number: r.NAFDAC ?? null,
      registration_date:
        r.registration_date ?? r.approval_date ?? (r.created_at ? String(r.created_at).split("T")[0] : null),
      approval_date: r.approval_date ?? null,
      expiry_date: r.expiry_date ?? null,
      status: r.status ?? "Active",
      strength: r.strength ?? null,
      pack_size: r.pack_size ?? null,
      composition: r.composition ?? null,
      last_synced: new Date().toISOString(),
    };

    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("nafdac_number", normalized.nafdac_number)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabaseAdmin.from("products").insert(normalized);
      if (insErr) throw insErr;
      added += 1;
    } else {
      const needsUpdate =
        isChanged ||
        existing.manufacturer !== normalized.manufacturer ||
        existing.registration_date !== normalized.registration_date ||
        existing.applicant !== normalized.applicant;

      if (needsUpdate) {
        const { error: updErr } = await supabaseAdmin.from("products").update(normalized).eq("id", existing.id);
        if (updErr) throw updErr;
        updated += 1;
      } else {
        unchanged += 1;
      }
    }
  }

  const nextStart = start + length;
  const done = rows.length === 0 || nextStart >= recordsTotal;

  return { recordsTotal, processed: rows.length, added, updated, unchanged, nextStart, done };
}

const OPPORTUNITY_TYPES = {
  EXPIRING: "Expiring Registration Opportunity",
  RENEWAL_WATCH: "Manufacturer Renewal Watch",
  NEW_APPROVAL: "New Approval Opportunity",
  INACTIVE: "Registration Inactive Opportunity",
} as const;

/**
 * Static fallback per-product service-fee estimates, used only when
 * OPENAI_API_KEY isn't configured or the AI estimate call fails. Still not
 * real market pricing either way -- there's no actual fee schedule wired in
 * anywhere. See getEstimatedRates() below for the AI-estimated version.
 */
const FALLBACK_VALUE_PER_PRODUCT: Record<string, number> = {
  [OPPORTUNITY_TYPES.EXPIRING]: 500_000,
  [OPPORTUNITY_TYPES.RENEWAL_WATCH]: 350_000,
  [OPPORTUNITY_TYPES.NEW_APPROVAL]: 200_000,
  [OPPORTUNITY_TYPES.INACTIVE]: 750_000,
};

/**
 * Asks OpenAI to estimate per-product NGN rates for each opportunity type,
 * once per sync run. NOTE: this is still not real pricing data -- the model
 * has no more grounded knowledge of actual Nigerian regulatory-consulting
 * fee schedules than the static fallback does. It just replaces a fixed
 * guess with a differently-sourced guess. Falls back to the static table
 * if no API key is configured or the call fails/returns something unusable.
 */
async function getEstimatedRates(): Promise<Record<string, number>> {
  const types = Object.values(OPPORTUNITY_TYPES);
  const parsed = await openaiChatJSON(
    "You estimate typical per-product service fees, in Nigerian Naira (NGN), that a Nigerian pharmaceutical regulatory affairs consulting firm might reasonably charge for different categories of NAFDAC-related work. " +
      `Reply with strict JSON mapping each of these exact keys to a positive integer NGN amount: ${JSON.stringify(types)}. ` +
      "These are rough per-product estimates for internal pipeline-value tracking, not a real quote. Reactivating a lapsed/inactive registration is normally more involved than routine renewal monitoring, which is itself more involved than lightweight post-approval support -- keep that relative ordering.",
    "Estimate the per-product NGN rates now.",
    { maxTokens: 300 },
  );

  if (parsed && types.every((t) => typeof parsed[t] === "number" && parsed[t] > 0)) {
    return parsed as Record<string, number>;
  }
  return FALLBACK_VALUE_PER_PRODUCT;
}

const DAY_MS = 24 * 3600 * 1000;
const EXPIRING_WINDOW_DAYS = 180;
const RECENT_APPROVAL_WINDOW_DAYS = 180;

function isActiveStatus(status: string | null | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === "active";
}

/**
 * Ranks candidates within ONE opportunity type by a type-appropriate
 * urgency metric (higher = more urgent) and splits them into even thirds.
 * Quantile-based rather than a fixed value threshold, so priority actually
 * differentiates regardless of how large or small this dataset's numbers
 * run -- a fixed "$5M+ = high" threshold either tags everything high (as it
 * did before, when every manufacturer cleared it) or nothing, depending on
 * the data; ranking within the group can't degenerate that way.
 */
function assignQuantilePriority<T>(items: T[], metric: (item: T) => number): Map<T, { priority: string; probability: number }> {
  const sorted = [...items].sort((a, b) => metric(b) - metric(a));
  const n = sorted.length;
  const result = new Map<T, { priority: string; probability: number }>();
  sorted.forEach((item, i) => {
    const pct = n <= 1 ? 0 : i / n;
    if (pct < 1 / 3) result.set(item, { priority: "high", probability: 80 });
    else if (pct < 2 / 3) result.set(item, { priority: "medium", probability: 60 });
    else result.set(item, { priority: "low", probability: 40 });
  });
  return result;
}

function opportunityServices(type: string): string {
  switch (type) {
    case OPPORTUNITY_TYPES.EXPIRING:
      return "Renewal filing, dossier update, regulatory follow-up";
    case OPPORTUNITY_TYPES.NEW_APPROVAL:
      return "Post-approval compliance support, variation filing readiness";
    case OPPORTUNITY_TYPES.INACTIVE:
      return "Registration reactivation, lapsed-status resolution";
    default:
      return "Registration support, renewal monitoring";
  }
}

function opportunityRecommendation(type: string, manufacturer: string, count: number): string {
  const plural = count === 1 ? "" : "s";
  switch (type) {
    case OPPORTUNITY_TYPES.EXPIRING:
      return `${manufacturer} has ${count} product${plural} expiring within ${EXPIRING_WINDOW_DAYS} days -- prioritize renewal outreach.`;
    case OPPORTUNITY_TYPES.NEW_APPROVAL:
      return `${manufacturer} recently received approval for ${count} product${plural} -- good window to offer ongoing regulatory support.`;
    case OPPORTUNITY_TYPES.INACTIVE:
      return `${manufacturer} has ${count} registration${plural} in inactive status -- potential reactivation engagement.`;
    default:
      return `Monitor ${manufacturer} for ${count} active registration${plural} and renewal opportunities.`;
  }
}

type OpportunityCandidate = {
  manufacturer: string;
  type: string;
  products: any[];
  closeDate: string;
  expiryDate: string | null;
  metric: number;
};

/**
 * Rebuilds the opportunities/renewals tables from the current products
 * table and writes the final sync_history row. Call this once, after the
 * caller has looped syncGreenBookBatch to completion.
 *
 * Each manufacturer's products are bucketed into up to 4 opportunity types
 * based on real signals (an "Emzor" with both products expiring soon AND
 * a recent new approval gets TWO opportunity rows, one per type) instead
 * of always generating a single generic "Manufacturer Renewal Watch" row
 * regardless of what's actually happening with that manufacturer's
 * portfolio.
 */
export async function finalizeGreenBookSync(
  supabaseAdmin: any,
  totals: { added: number; updated: number; unchanged: number },
  startedAt: string,
) {
  const { data: allProducts } = await supabaseAdmin
    .from("products")
    .select("id,product_name,manufacturer,category,expiry_date,approval_date,applicant,nafdac_number,status");

  const now = Date.now();
  const expiringCutoff = now + EXPIRING_WINDOW_DAYS * DAY_MS;
  const recentApprovalCutoff = now - RECENT_APPROVAL_WINDOW_DAYS * DAY_MS;

  type Buckets = { expiring: any[]; recentApproval: any[]; inactive: any[]; stable: any[] };
  const byManufacturer: Record<string, Buckets> = {};

  for (const p of allProducts ?? []) {
    const owner = p.manufacturer ?? p.applicant;
    if (!owner) continue;
    if (!byManufacturer[owner]) byManufacturer[owner] = { expiring: [], recentApproval: [], inactive: [], stable: [] };
    const g = byManufacturer[owner];

    const expiry = p.expiry_date ? new Date(p.expiry_date).getTime() : null;
    const approval = p.approval_date ? new Date(p.approval_date).getTime() : null;

    if (!isActiveStatus(p.status)) {
      g.inactive.push(p);
    } else if (expiry !== null && expiry >= now && expiry <= expiringCutoff) {
      g.expiring.push(p);
    } else if (approval !== null && approval >= recentApprovalCutoff) {
      g.recentApproval.push(p);
    } else {
      g.stable.push(p);
    }
  }

  const candidatesByType: Record<string, OpportunityCandidate[]> = {
    [OPPORTUNITY_TYPES.EXPIRING]: [],
    [OPPORTUNITY_TYPES.NEW_APPROVAL]: [],
    [OPPORTUNITY_TYPES.INACTIVE]: [],
    [OPPORTUNITY_TYPES.RENEWAL_WATCH]: [],
  };

  for (const [manufacturer, g] of Object.entries(byManufacturer)) {
    if (g.expiring.length) {
      const earliest = g.expiring.map((p) => p.expiry_date as string).filter(Boolean).sort()[0];
      const daysToExpiry = (new Date(earliest).getTime() - now) / DAY_MS;
      candidatesByType[OPPORTUNITY_TYPES.EXPIRING].push({
        manufacturer,
        type: OPPORTUNITY_TYPES.EXPIRING,
        products: g.expiring,
        closeDate: earliest,
        expiryDate: earliest,
        metric: -daysToExpiry, // sooner expiry -> higher urgency
      });
    }
    if (g.recentApproval.length) {
      const mostRecent = g.recentApproval.map((p) => p.approval_date as string).filter(Boolean).sort().reverse()[0];
      const closeDate = new Date(new Date(mostRecent).getTime() + 90 * DAY_MS).toISOString().slice(0, 10);
      const daysSinceApproval = (now - new Date(mostRecent).getTime()) / DAY_MS;
      candidatesByType[OPPORTUNITY_TYPES.NEW_APPROVAL].push({
        manufacturer,
        type: OPPORTUNITY_TYPES.NEW_APPROVAL,
        products: g.recentApproval,
        closeDate,
        expiryDate: null,
        metric: -daysSinceApproval, // more recent -> higher urgency
      });
    }
    if (g.inactive.length) {
      candidatesByType[OPPORTUNITY_TYPES.INACTIVE].push({
        manufacturer,
        type: OPPORTUNITY_TYPES.INACTIVE,
        products: g.inactive,
        closeDate: new Date(now + 60 * DAY_MS).toISOString().slice(0, 10),
        expiryDate: null,
        metric: g.inactive.length,
      });
    }
    if (g.stable.length) {
      const expiryDates = g.stable.map((p) => p.expiry_date as string).filter(Boolean).sort();
      candidatesByType[OPPORTUNITY_TYPES.RENEWAL_WATCH].push({
        manufacturer,
        type: OPPORTUNITY_TYPES.RENEWAL_WATCH,
        products: g.stable,
        closeDate: new Date(now + 180 * DAY_MS).toISOString().slice(0, 10),
        expiryDate: expiryDates[0] ?? null,
        metric: g.stable.length,
      });
    }
  }

  const rates = await getEstimatedRates();

  await supabaseAdmin.from("opportunities").delete();
  const oppInserts: any[] = [];
  for (const candidates of Object.values(candidatesByType)) {
    const priorityMap = assignQuantilePriority(candidates, (c) => c.metric);
    for (const c of candidates) {
      const { priority, probability } = priorityMap.get(c)!;
      const rate = rates[c.type];
      const count = c.products.length;
      oppInserts.push({
        company: c.manufacturer,
        manufacturer: c.manufacturer,
        product: count === 1 ? c.products[0].product_name : `${count} products`,
        category: c.products[0]?.category ?? null,
        product_count: count,
        estimated_value: count * rate,
        services: opportunityServices(c.type),
        opportunity_type: c.type,
        service_type: c.type,
        status: "active",
        priority,
        probability,
        close_date: c.closeDate,
        expiry_date: c.expiryDate,
        recommendation: opportunityRecommendation(c.type, c.manufacturer, count),
        source_product_id: c.products[0]?.id ?? null,
      });
    }
  }
  if (oppInserts.length) {
    const { error: oppErr } = await supabaseAdmin.from("opportunities").insert(oppInserts);
    if (oppErr) throw oppErr;
  }

  await supabaseAdmin.from("renewals").delete();
  const renewalsInserts: any[] = [];
  for (const p of allProducts ?? []) {
    if (p.expiry_date) {
      renewalsInserts.push({
        product_id: p.id,
        product_name: p.product_name,
        nafdac_number: p.nafdac_number,
        category: p.category,
        applicant: p.applicant,
        expiry_date: p.expiry_date,
        status: p.status ?? "Active",
      });
    }
  }
  if (renewalsInserts.length) {
    const { error: renErr } = await supabaseAdmin.from("renewals").insert(renewalsInserts);
    if (renErr) throw renErr;
  }

  const finishedAt = new Date().toISOString();
  const { error: histErr } = await supabaseAdmin.from("sync_history").insert({
    status: "success",
    records_added: totals.added,
    records_updated: totals.updated,
    message: `Sync completed: ${totals.added} added, ${totals.updated} updated, ${totals.unchanged} unchanged`,
    started_at: startedAt,
    finished_at: finishedAt,
  });
  if (histErr) throw histErr;

  return { status: "success" as const, ...totals, finishedAt };
}

/**
 * Unattended entry point for the scheduled sync (see /api/cron-sync). Runs
 * batches in a plain server-side loop -- no browser tab required -- until
 * either the catalog is fully synced or `timeBudgetMs` is used up.
 *
 * There's no dedicated column to persist a resume cursor between runs (no
 * schema/migration access to this Supabase project), so the resume position
 * is encoded as text in sync_history.message ("RESUME:<start>:<batchId>")
 * on partial/error rows and parsed back out on the next run. A cron tick
 * that finds NAFDAC still unreachable resumes from the same position next
 * time rather than restarting the whole catalog from zero.
 */
export async function runCronSync(supabaseAdmin: any, timeBudgetMs = 270_000) {
  const deadline = Date.now() + timeBudgetMs;

  const { data: latest } = await supabaseAdmin
    .from("sync_history")
    .select("status,message,started_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let start = 0;
  let startedAt = new Date().toISOString();
  let batchId = crypto.randomUUID();

  if (latest?.status === "partial" || latest?.status === "error") {
    const m = latest.message?.match(/^RESUME:(\d+):([0-9a-f-]+)/);
    if (m) {
      start = Number(m[1]);
      batchId = m[2];
      startedAt = latest.started_at;
    }
  }

  const totals = { added: 0, updated: 0, unchanged: 0 };

  try {
    while (Date.now() < deadline) {
      const result = await syncGreenBookBatch(supabaseAdmin, batchId, start, 100);
      totals.added += result.added;
      totals.updated += result.updated;
      totals.unchanged += result.unchanged;

      if (result.done) {
        await finalizeGreenBookSync(supabaseAdmin, totals, startedAt);
        return { status: "complete" as const, ...totals };
      }
      start = result.nextStart;
    }

    await supabaseAdmin.from("sync_history").insert({
      status: "partial",
      records_added: totals.added,
      records_updated: totals.updated,
      message: `RESUME:${start}:${batchId}`,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    return { status: "partial" as const, nextStart: start, ...totals };
  } catch (err: any) {
    await supabaseAdmin.from("sync_history").insert({
      status: "error",
      records_added: totals.added,
      records_updated: totals.updated,
      message: `RESUME:${start}:${batchId} -- ${err?.message ?? String(err)}`,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    return { status: "error" as const, message: err?.message ?? String(err) };
  }
}

export async function recordSyncFailure(
  supabaseAdmin: any,
  message: string,
  startedAt: string,
  partial: { added: number; updated: number },
) {
  const finishedAt = new Date().toISOString();
  await supabaseAdmin.from("sync_history").insert({
    status: "error",
    records_added: partial.added,
    records_updated: partial.updated,
    message: `Sync failed: ${message}`,
    started_at: startedAt,
    finished_at: finishedAt,
  });
}
