import crypto from "crypto";

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
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: GREENBOOK_URL,
    },
  });

  if (!res.ok) throw new Error(`Green Book request failed ${res.status}`);
  const json = await res.json();

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

/**
 * Rebuilds the opportunities/renewals tables from the current products
 * table and writes the final sync_history row. Call this once, after the
 * caller has looped syncGreenBookBatch to completion.
 */
export async function finalizeGreenBookSync(
  supabaseAdmin: any,
  totals: { added: number; updated: number; unchanged: number },
  startedAt: string,
) {
  const { data: allProducts } = await supabaseAdmin
    .from("products")
    .select("id,product_name,manufacturer,category,expiry_date,applicant,nafdac_number,status");

  await supabaseAdmin.from("opportunities").delete();
  const byManufacturer: Record<string, any[]> = {};
  for (const p of allProducts ?? []) {
    const owner = p.manufacturer ?? p.applicant;
    if (owner) {
      byManufacturer[owner] = byManufacturer[owner] || [];
      byManufacturer[owner].push(p);
    }
  }
  const oppInserts: any[] = [];
  for (const [m, ps] of Object.entries(byManufacturer)) {
    const expiryDates = ps
      .map((p) => p.expiry_date)
      .filter(Boolean)
      .sort();
    oppInserts.push({
      company: m,
      manufacturer: m,
      product: ps.length === 1 ? ps[0].product_name : `${ps.length} products`,
      category: ps[0].category ?? null,
      product_count: ps.length,
      estimated_value: ps.length * 500000,
      services: "Registration support, renewal monitoring",
      opportunity_type: "Manufacturer Renewal Watch",
      service_type: "Manufacturer Renewal Watch",
      status: "active",
      priority: ps.length * 500000 > 5000000 ? "high" : ps.length * 500000 > 1000000 ? "medium" : "low",
      probability: ps.length * 500000 > 5000000 ? 80 : ps.length * 500000 > 1000000 ? 60 : 40,
      close_date: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      expiry_date: expiryDates[0] ?? null,
      recommendation: `Monitor ${m} for ${ps.length} active registration${ps.length === 1 ? "" : "s"} and renewal opportunities.`,
      source_product_id: ps[0]?.id ?? null,
    });
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
