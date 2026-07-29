import { logCaseEvent, type IcsrCase } from "./icsr-queries";

/**
 * Pharmacovigilance AI placeholders.
 *
 * These are intentionally NOT implemented. Each function is the single
 * integration point for the real model call (Lovable AI Gateway) later on.
 * For now they only record the action on the case timeline and return a
 * human-readable placeholder message.
 */

export type AiPlaceholderResult = { ok: boolean; message: string };

async function placeholder(
  c: IcsrCase,
  eventType: string,
  label: string,
): Promise<AiPlaceholderResult> {
  await logCaseEvent(c.id, eventType, `${label} requested (AI not yet enabled — placeholder)`);
  return {
    ok: false,
    message: `${label} is not enabled yet. The action has been recorded on the case timeline; wire the model call in src/lib/icsr-ai.ts when AI is switched on.`,
  };
}

export const generateNarrative = (c: IcsrCase) =>
  placeholder(c, "AI Narrative Generated", "Generate narrative");

export const generateMedicalSummary = (c: IcsrCase) =>
  placeholder(c, "AI Narrative Generated", "Generate medical summary");

export const generateCioms = (c: IcsrCase) => placeholder(c, "Report Generated", "Generate CIOMS I");

export const generateMedWatch = (c: IcsrCase) =>
  placeholder(c, "Report Generated", "Generate MedWatch 3500A");

export const generateE2bXml = (c: IcsrCase) => placeholder(c, "Report Generated", "Generate E2B(R3) XML");
