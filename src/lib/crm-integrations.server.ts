/**
 * Server-only integration helpers for the MedNova OS CRM.
 *
 *   TAVILY_API_KEY  -> company intelligence + contact discovery (live)
 *   LOVABLE_API_KEY -> outreach email generation via Lovable AI Gateway (live)
 *   RESEND_API_KEY  -> transactional email sending (optional; draft-only without it)
 *   FROM_EMAIL / SENDER_NAME / CONSULTATION_EMAIL -> sender identity
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

type TavilyResult = { title?: string; url?: string; content?: string };
type TavilyResponse = { answer?: string; results?: TavilyResult[] };

async function tavilySearch(
  apiKey: string,
  query: string,
  opts: { depth?: "basic" | "advanced"; max?: number; includeDomains?: string[] } = {},
): Promise<TavilyResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      search_depth: opts.depth ?? "advanced",
      include_answer: true,
      max_results: opts.max ?? 8,
      ...(opts.includeDomains?.length ? { include_domains: opts.includeDomains } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[tavily] request failed [${res.status}]: ${body}`);
    throw new Error(`Tavily request failed [${res.status}]: ${body}`);
  }
  return (await res.json()) as TavilyResponse;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

function pickUrl(results: TavilyResult[], predicate: (u: string) => boolean) {
  return results.map((r) => r.url ?? "").find((u) => u && predicate(u.toLowerCase())) ?? "";
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Picks an email from the search-result blob, preferring one on the
 * company's own domain over the first email-looking string anywhere in the
 * blended results (which could belong to a journalist, an unrelated
 * company, or boilerplate on a page that merely mentions this company).
 */
function pickEmailForDomain(blob: string, domain: string | null): string {
  const matches = blob.match(new RegExp(EMAIL_RE.source, "gi")) ?? [];
  if (domain) {
    const onDomain = matches.find((e) => e.toLowerCase().endsWith(`@${domain}`));
    if (onDomain) return onDomain.toLowerCase();
  }
  return (matches[0] ?? "").toLowerCase();
}

function extractPeople(text: string): { name: string; role: string }[] {
  const roles =
    "Chief Executive Officer|CEO|Managing Director|Chairman|Chief Operating Officer|COO|Chief Financial Officer|CFO|Commercial Director|Sales Director|Marketing Director|Head of Regulatory Affairs|Regulatory Affairs Manager|Head of Procurement|General Manager|Country Manager|Business Development Manager";
  const re = new RegExp(
    `([A-Z][a-z]+(?:\\s+[A-Z][a-z'.-]+){1,2})\\s*(?:,|—|-|–|\\bis\\b|\\bas\\b|\\bthe\\b)?\\s*(?:the\\s+)?(${roles})`,
    "g",
  );
  const out: { name: string; role: string }[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, role: m[2] });
    if (out.length >= 6) break;
  }
  return out;
}

export async function tavilyCompanyIntelligence(
  name: string,
  manufacturer: string | null,
): Promise<CompanyIntelligence> {
  const apiKey = process.env.TAVILY_API_KEY;
  const host = `${slug(name)}.com`;

  if (apiKey) {
    try {
      const [profile, news, people] = await Promise.all([
        tavilySearch(apiKey, `${name} pharmaceutical company official website contact address about`),
        tavilySearch(apiKey, `${name} pharmaceutical Nigeria news announcement partnership`, {
          depth: "basic",
          max: 6,
        }),
        tavilySearch(apiKey, `${name} leadership team executives managing director regulatory affairs`, {
          max: 6,
        }),
      ]);

      const website =
        pickUrl(profile.results ?? [], (u) => !u.includes("linkedin") && !u.includes("facebook")) ||
        `https://www.${host}`;
      const domain = extractDomain(website);

      // Once the company's own domain is known, run a second search scoped
      // to JUST that domain for its published contact info -- far more
      // likely to be the real contact page than a generic web-wide search.
      let siteContact: TavilyResponse | null = null;
      if (domain) {
        try {
          siteContact = await tavilySearch(apiKey, `${name} contact email phone address`, {
            includeDomains: [domain],
            max: 3,
            depth: "basic",
          });
        } catch (err) {
          console.error("[tavily] site-scoped contact search failed:", err);
        }
      }

      const all = [...(profile.results ?? []), ...(people.results ?? []), ...(siteContact?.results ?? [])];
      const blob = all.map((r) => `${r.title ?? ""} ${r.content ?? ""}`).join("\n");
      const executives = extractPeople(blob);

      const linkedin =
        pickUrl(all, (u) => u.includes("linkedin.com/company")) ||
        pickUrl(all, (u) => u.includes("linkedin.com")) ||
        "";

      return {
        website,
        about: profile.answer ?? `${name} profile compiled from live web sources.`,
        recent_news: (news.results ?? [])
          .slice(0, 5)
          .map((r) => `${r.title ?? "Update"}${r.url ? ` — ${r.url}` : ""}`),
        linkedin,
        business_description:
          people.answer ??
          profile.answer ??
          `${name} operates in the pharmaceutical sector${manufacturer ? `, linked to ${manufacturer}` : ""}.`,
        email: pickEmailForDomain(blob, domain),
        phone: blob.match(PHONE_RE)?.[0]?.trim() ?? "",
        key_executives: executives.slice(0, 3),
        decision_makers: executives.slice(3, 6),
        commercial_insights: (profile.results ?? [])
          .slice(0, 3)
          .map((r) => (r.content ?? "").slice(0, 220))
          .filter(Boolean),
        nafdac_presence: manufacturer
          ? `Registered products linked to manufacturer ${manufacturer} in the NAFDAC Green Book.`
          : "NAFDAC Green Book footprint available in the Products module.",
        market_position: news.answer ?? "Market position derived from recent web coverage.",
        placeholder: false,
      };
    } catch (err) {
      console.error("[tavily] intelligence lookup failed:", err);
    }
  }

  return {
    website: `https://www.${host}`,
    about: `${name} is a pharmaceutical organisation active in the Nigerian market${
      manufacturer ? ` with manufacturing linked to ${manufacturer}` : ""
    }. Live intelligence unavailable.`,
    recent_news: [],
    linkedin: "",
    business_description: "Intelligence provider unavailable — showing fallback profile.",
    email: `info@${host}`,
    phone: "",
    key_executives: [],
    decision_makers: [],
    commercial_insights: [],
    nafdac_presence: "NAFDAC Green Book footprint available in the Products module.",
    market_position: "Unavailable.",
    placeholder: true,
  };
}

export async function tavilyDiscoverContacts(name: string): Promise<DiscoveredContact[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  const host = `${slug(name)}.com`;

  if (apiKey) {
    try {
      const res = await tavilySearch(
        apiKey,
        `${name} contact email leadership team managing director regulatory affairs commercial`,
      );
      const results = res.results ?? [];

      const website = pickUrl(results, (u) => !u.includes("linkedin") && !u.includes("facebook"));
      const domain = extractDomain(website);

      let siteContact: TavilyResponse | null = null;
      if (domain) {
        try {
          siteContact = await tavilySearch(apiKey, `${name} contact email phone address`, {
            includeDomains: [domain],
            max: 3,
            depth: "basic",
          });
        } catch (err) {
          console.error("[tavily] site-scoped contact search failed:", err);
        }
      }

      const all = [...results, ...(siteContact?.results ?? [])];
      const blob = all.map((r) => `${r.title ?? ""} ${r.content ?? ""}`).join("\n");
      const people = extractPeople(blob);
      const email = pickEmailForDomain(blob, domain);
      const phone = blob.match(PHONE_RE)?.[0]?.trim() ?? "";
      const linkedin = pickUrl(all, (u) => u.includes("linkedin.com"));

      if (people.length > 0) {
        return people.map((p) => ({
          name: p.name,
          role: p.role,
          department: /regulator/i.test(p.role)
            ? "Regulatory"
            : /commercial|sales|marketing|business/i.test(p.role)
              ? "Commercial"
              : "Executive",
          email,
          phone,
          linkedin,
          source: "Tavily",
        }));
      }
    } catch (err) {
      console.error("[tavily] contact discovery failed:", err);
    }
  }

  return [
    {
      name: "Regulatory Affairs",
      role: "Regulatory Affairs Manager",
      department: "Regulatory",
      email: `regulatory@${host}`,
      phone: "",
      linkedin: "",
      source: "Inferred",
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
  const senderName = process.env.SENDER_NAME ?? "MedNova Lifesciences";
  const fromEmail = process.env.FROM_EMAIL ?? "info@mednovalife.com";
  const signature = `${senderName}\n${fromEmail}`;
  const lovableKey = process.env.LOVABLE_API_KEY;

  if (lovableKey) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash",
          messages: [
            {
              role: "system",
              content:
                "You write concise B2B regulatory-consulting outreach emails for MedNova Lifesciences, a Nigerian pharmaceutical regulatory affairs firm. Reply with strict JSON: {\"subject\": string, \"body\": string}. No markdown, no signature block (it is appended separately). Keep the body under 180 words.",
            },
            {
              role: "user",
              content: JSON.stringify({
                company: input.company,
                contact_name: input.contactName,
                category: input.category,
                product: input.product,
                regulatory_insight: input.recommendation,
              }),
            },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[lovable-ai] email generation failed [${res.status}]: ${body}`);
      } else {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = json.choices?.[0]?.message?.content ?? "";
        const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
        if (parsed.subject && parsed.body) {
          return {
            subject: parsed.subject,
            recipient: input.contactEmail ?? "",
            body: parsed.body,
            signature,
            placeholder: false,
          };
        }
      }
    } catch (err) {
      console.error("[lovable-ai] email generation error:", err);
    }
  }

  const subject = `Regulatory support for ${input.company}${
    input.category ? ` — ${input.category} portfolio` : ""
  }`;
  const body = [
    `Dear ${input.contactName ?? "Colleague"},`,
    "",
    `I am reaching out from ${senderName} regarding ${input.company}'s NAFDAC registrations${
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

  return { subject, recipient: input.contactEmail ?? "", body, signature, placeholder: true };
}

export async function sendEmail(payload: {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL ?? "info@mednovalife.com";
  const senderName = process.env.SENDER_NAME ?? "MedNova Lifesciences";

  if (!apiKey) {
    return {
      sent: false,
      placeholder: true as const,
      message: "Email provider not configured — message stored as a draft.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: `${senderName} <${fromEmail}>`,
      to: payload.to.split(",").map((s) => s.trim()).filter(Boolean),
      ...(payload.cc ? { cc: payload.cc.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      ...(payload.bcc ? { bcc: payload.bcc.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      subject: payload.subject,
      text: payload.body,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[resend] send failed [${res.status}]: ${body}`);
    return { sent: false, placeholder: false as const, message: `Send failed [${res.status}]: ${body}` };
  }

  return { sent: true, placeholder: false as const, message: "Email sent." };
}
