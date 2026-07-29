/**
 * Server-only integration helpers for the MedNova OS CRM.
 *
 * All three providers are placeholders today. Each function documents exactly
 * where the real API key and request go, so the integration can be completed
 * without touching any UI code.
 *
 *   TAVILY_API_KEY  -> company intelligence + contact discovery
 *   OPENAI_API_KEY  -> outreach email generation (or LOVABLE_API_KEY gateway)
 *   RESEND_API_KEY  -> transactional email sending
 *
 * Add the keys with the Lovable secrets flow; they are then available here as
 * process.env.<NAME> at request time.
 */

export type CompanyIntelligence = {
  website: string;
  about: string;
  recent_news: string[];
  linkedin: string;
  business_description: string;
  email: string;
  phone: string;
  key_executives: { name: string; role: string }[];
  decision_makers: { name: string; role: string }[];
  commercial_insights: string[];
  nafdac_presence: string;
  market_position: string;
  placeholder: boolean;
};

export type DiscoveredContact = {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  linkedin: string;
  source: string;
};

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";

export async function tavilyCompanyIntelligence(
  name: string,
  manufacturer: string | null,
): Promise<CompanyIntelligence> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (apiKey) {
    // === TAVILY INTEGRATION POINT ===
    // const res = await fetch("https://api.tavily.com/search", {
    //   method: "POST",
    //   headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    //   body: JSON.stringify({ query: `${name} pharmaceutical company profile`, search_depth: "advanced", include_answer: true }),
    // });
    // if (!res.ok) throw new Error(`Tavily failed [${res.status}]: ${await res.text()}`);
    // return mapTavilyResponse(await res.json());
  }

  const host = `${slug(name)}.com`;
  return {
    website: `https://www.${host}`,
    about: `${name} is a pharmaceutical organisation active in the Nigerian market${
      manufacturer ? ` with manufacturing linked to ${manufacturer}` : ""
    }. Placeholder profile — connect Tavily to populate live data.`,
    recent_news: [
      "Placeholder: recent regulatory filing coverage will appear here.",
      "Placeholder: distribution and partnership announcements.",
      "Placeholder: market expansion news.",
    ],
    linkedin: `https://www.linkedin.com/company/${slug(name)}`,
    business_description:
      "Placeholder business description sourced from Tavily once the API key is configured.",
    email: `info@${host}`,
    phone: "+234 000 000 0000",
    key_executives: [
      { name: "Placeholder Executive", role: "Managing Director" },
      { name: "Placeholder Executive", role: "Head of Regulatory Affairs" },
    ],
    decision_makers: [
      { name: "Placeholder Decision Maker", role: "Commercial Director" },
      { name: "Placeholder Decision Maker", role: "Head of Procurement" },
    ],
    commercial_insights: [
      "Placeholder: portfolio concentration and renewal exposure.",
      "Placeholder: estimated regulatory service spend.",
    ],
    nafdac_presence: "Placeholder: registered product footprint from Green Book.",
    market_position: "Placeholder: competitive position summary.",
    placeholder: true,
  };
}

export async function tavilyDiscoverContacts(name: string): Promise<DiscoveredContact[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (apiKey) {
    // === TAVILY INTEGRATION POINT (contact discovery) ===
    // Query Tavily for "<name> leadership team contact" and map the results.
  }
  const host = `${slug(name)}.com`;
  return [
    {
      name: "Placeholder Contact",
      role: "Regulatory Affairs Manager",
      department: "Regulatory",
      email: `regulatory@${host}`,
      phone: "+234 000 000 0001",
      linkedin: `https://www.linkedin.com/company/${slug(name)}`,
      source: "Tavily (placeholder)",
    },
    {
      name: "Placeholder Contact",
      role: "Commercial Director",
      department: "Commercial",
      email: `commercial@${host}`,
      phone: "+234 000 000 0002",
      linkedin: `https://www.linkedin.com/company/${slug(name)}`,
      source: "Tavily (placeholder)",
    },
  ];
}

export async function generateOutreachEmail(input: {
  company: string;
  contactName: string | null;
  contactEmail: string | null;
  category: string | null;
  product: string | null;
  recommendation: string | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.LOVABLE_API_KEY;
  if (process.env.OPENAI_API_KEY) {
    // === OPENAI INTEGRATION POINT ===
    // const res = await fetch("https://api.openai.com/v1/responses", {
    //   method: "POST",
    //   headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    //   body: JSON.stringify({ model: "gpt-4.1-mini", input: buildPrompt(input) }),
    // });
    // if (!res.ok) throw new Error(`OpenAI failed [${res.status}]: ${await res.text()}`);
  }
  void apiKey;

  const subject = `Regulatory support for ${input.company}${
    input.category ? ` — ${input.category} portfolio` : ""
  }`;
  const body = [
    `Dear ${input.contactName ?? "Colleague"},`,
    "",
    `I am reaching out from MedNova regarding ${input.company}'s NAFDAC registrations${
      input.product ? `, including ${input.product}` : ""
    }.`,
    "",
    input.recommendation
      ? `Our regulatory intelligence highlights: ${input.recommendation}`
      : "Our regulatory intelligence highlights upcoming renewal and registration milestones for your portfolio.",
    "",
    "We support dossier preparation, renewals and variations end to end, and would welcome a short call to walk you through what we found.",
    "",
    "Kind regards,",
  ].join("\n");

  return {
    subject,
    recipient: input.contactEmail ?? "",
    body,
    signature: "MedNova Regulatory Intelligence\nbd@mednova.africa\n+234 000 000 0000",
    placeholder: true,
  };
}

/**
 * Placeholder send. Connect Resend here:
 *
 *   const res = await fetch("https://api.resend.com/emails", {
 *     method: "POST",
 *     headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
 *     body: JSON.stringify({ from, to, cc, bcc, subject, html }),
 *   });
 */
export async function sendEmail(payload: {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, placeholder: true as const, message: "Resend API key not configured — email stored as a draft." };
  }
  // === RESEND INTEGRATION POINT ===
  void payload;
  return { sent: false, placeholder: true as const, message: "Resend integration point is not wired yet." };
}
