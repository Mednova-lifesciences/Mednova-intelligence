import { createServerFn } from "@tanstack/react-start";
import {
  tavilyCompanyIntelligence,
  tavilyDiscoverContacts,
  generateOutreachEmail,
  sendEmail,
} from "./crm-integrations.server";

export const getCompanyIntelligence = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; manufacturer: string | null }) => input)
  .handler(async ({ data }) => tavilyCompanyIntelligence(data.name, data.manufacturer));

export const discoverContacts = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data }) => tavilyDiscoverContacts(data.name));

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      company: string;
      contactName: string | null;
      contactEmail: string | null;
      category: string | null;
      product: string | null;
      recommendation: string | null;
    }) => input,
  )
  .handler(async ({ data }) => generateOutreachEmail(data));

export const sendEmailFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { to: string; cc: string; bcc: string; subject: string; body: string }) => input,
  )
  .handler(async ({ data }) => sendEmail(data));
