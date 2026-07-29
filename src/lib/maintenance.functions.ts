import { createServerFn } from "@tanstack/react-start";

export const backfillCompanyManufacturers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from("companies")
    .select("id,name,manufacturer,product")
    .is("manufacturer", null)
    .limit(1000);

  if (companiesError) throw companiesError;
  if (!companies?.length) return { updated: 0 };

  let updated = 0;

  for (const company of companies) {
    const { data: opportunities, error: oppError } = await supabaseAdmin
      .from("opportunities")
      .select("manufacturer,product,service_type")
      .eq("company", company.name)
      .order("estimated_value", { ascending: false })
      .limit(20);

    if (oppError) throw oppError;

    const manufacturer =
      opportunities?.find((o) => o.manufacturer && o.manufacturer.trim())?.manufacturer ?? company.name;
    const product =
      company.product ||
      opportunities?.find((o) => o.product && o.product.trim())?.product ??
      opportunities?.find((o) => o.service_type && o.service_type.trim())?.service_type ??
      null;

    const patch: Record<string, string | null> = { manufacturer };
    if (product) patch.product = product;

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update(patch)
      .eq("id", company.id);

    if (updateError) throw updateError;
    updated += 1;
  }

  return { updated };
});
