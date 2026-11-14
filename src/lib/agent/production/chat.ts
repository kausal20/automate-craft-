/**
 * Chat glue: decide whether a chat message is an automation request, and turn
 * a preview into the plain chat reply. No model calls here.
 */

import { intentEngine } from "../intent";
import { normalizeLang } from "./errors";
import type { PreviewResponse } from "./types";

/** Hinglish / Hindi cues the English intent regex does not cover. */
const INDIC_AUTOMATION_RE =
  /\b(jab(hi)?|jaise hi|har (din|roz|subah|shaam)|bhejo|bhej do|bhejna|save karo|add karo|alert karo|follow[- ]?up)\b|जब|भेजो|भेजें|हर दिन|अलर्ट/i;

export async function looksLikeAutomationRequest(sessionId: string, text: string): Promise<boolean> {
  if (!text.trim()) return false;
  if (INDIC_AUTOMATION_RE.test(text)) return true;
  const intent = await intentEngine.detect({ sessionId, text });
  return intent.isAutomationRequest;
}

const LABELS = {
  en: { cost: "Estimated cost", credits: "credits", ask: "Before I build it, please answer:", connect: "Please connect first:", choose: "choose which account", confirm: "Reply with your answers, then press Confirm to build. Nothing is built or switched on until you confirm." },
  hinglish: { cost: "Andaazan kharcha", credits: "credits", ask: "Banane se pehle yeh bataiye:", connect: "Pehle connect karein:", choose: "kaunsa account use karna hai chuniye", confirm: "Jawab dijiye, phir Confirm dabaiye. Confirm se pehle kuch nahi banega ya chalu hoga." },
  hi: { cost: "अनुमानित खर्च", credits: "क्रेडिट", ask: "बनाने से पहले यह बताइए:", connect: "पहले जोड़ें:", choose: "कौन सा खाता इस्तेमाल करना है चुनिए", confirm: "जवाब दीजिए, फिर Confirm दबाइए। पुष्टि से पहले कुछ नहीं बनेगा या चालू होगा।" },
} as const;

export function previewToChatText(p: PreviewResponse): string {
  if (p.status === "rejected") return p.reason ?? "";
  const l = LABELS[normalizeLang(p.language)];
  const lines = [p.preview, "", `${l.cost}: ${p.costEstimate} ${l.credits}`];
  if (p.questions.length > 0) {
    lines.push("", l.ask, ...p.questions.map((q, i) => `${i + 1}. ${q.question}`));
  }
  if (p.connections.length > 0) {
    lines.push("", l.connect, ...p.connections.map((c) => (c.state === "choose" ? `- ${c.label} (${l.choose})` : `- ${c.label}`)));
  }
  lines.push("", l.confirm);
  return lines.join("\n");
}
