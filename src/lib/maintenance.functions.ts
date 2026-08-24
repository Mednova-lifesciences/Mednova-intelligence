import { createServerFn } from "@tanstack/react-start";

/**
 * Backfills companies created before country/manufacturer were properly
 * populated (or from an older version of addCompanyFromOpportunity that
 * didn't fall back to the opportunity's own company name). Every company
 * here originates from the NAFDAC Green Book, which only regulates the
 * Nigerian market, so a missing country is always "Nigeria" -- there's no
 * ambiguity to resolve.
 */
export const backfillCompanyManufacturers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from("companies")
    .select("id,name,manufacturer,product,country")
    .or("manufacturer.is.null,country.is.null")
    .limit(1000);

  if (companiesError) throw companiesError;
  if (!companies?.length) return { updated: 0 };

  let updated = 0;

  for (const company of companies) {
    let manufacturer = company.manufacturer;
    let product = company.product;

    if (!manufacturer) {
      const { data: opportunities, error: oppError } = await supabaseAdmin
        .from("opportunities")
        .select("manufacturer,product,service_type")
        .eq("company", company.name)
        .order("estimated_value", { ascending: false })
        .limit(20);

      if (oppError) throw oppError;

      manufacturer =
        opportunities?.find((o) => o.manufacturer && o.manufacturer.trim())?.manufacturer ?? company.name;
      const fallbackProduct =
        opportunities?.find((o) => o.product && o.product.trim())?.product ??
        opportunities?.find((o) => o.service_type && o.service_type.trim())?.service_type ??
        null;
      product = company.product || fallbackProduct;
    }

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        manufacturer,
        ...(product ? { product } : {}),
        ...(company.country ? {} : { country: "Nigeria" }),
      })
      .eq("id", company.id);

    if (updateError) throw updateError;
    updated += 1;
  }

  return { updated };
});
