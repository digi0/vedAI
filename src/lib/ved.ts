import "server-only";

import { getProfile, listMetrics, listInsights, listRecords } from "./db";
import { latestValue, metricStatus, STATUS_LABEL } from "./metric-status";

/**
 * Builds Ved's system prompt: persona + the signed-in user's health context.
 * Called per request (cheap reads), so Ved always answers from current data.
 */
export async function buildVedSystemPrompt(): Promise<string> {
  const [profile, metrics, insights, records] = await Promise.all([
    getProfile().catch(() => null),
    listMetrics().catch(() => []),
    listInsights().catch(() => []),
    listRecords().catch(() => []),
  ]);

  const name = profile?.name?.split(" ")[0] || "there";

  const metricLines =
    metrics
      .filter((m) => latestValue(m) !== null)
      .map((m) => {
        const v = latestValue(m)!;
        const st = metricStatus(m);
        const rng = m.healthyRange
          ? ` (normal ${m.healthyRange[0]}–${m.healthyRange[1]})`
          : "";
        return `- ${m.label}: ${v} ${m.unit} — ${STATUS_LABEL[st]}${rng}`;
      })
      .join("\n") || "No metrics tracked yet.";

  const recordLines =
    records
      .slice(0, 6)
      .map(
        (r) =>
          `- ${r.title} (${r.type}, ${r.date})${r.summary ? `: ${r.summary}` : ""}`,
      )
      .join("\n") || "No records uploaded yet.";

  const insightLines =
    insights
      .map((i) => `- [${i.severity}] ${i.title}: ${i.detail}`)
      .join("\n") || "No insights generated yet.";

  const profileLines =
    [
      profile?.bloodType && `Blood type: ${profile.bloodType}`,
      profile?.allergies?.length && `Allergies: ${profile.allergies.join(", ")}`,
      profile?.conditions?.length && `Conditions: ${profile.conditions.join(", ")}`,
      profile?.medications?.length &&
        `Medications: ${profile.medications.map((m) => `${m.name} ${m.dose}`).join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n") || "No profile details yet.";

  return `You are Ved — a warm, plain-spoken health companion inside the Ved AI app. You help ${name} understand their own medical records and health metrics.

How you talk:
- Use simple, everyday words. If a medical term is unavoidable, explain it in a short phrase right after (e.g. "LDL — the 'bad' cholesterol").
- Mirror the user's language. If they write in Hindi or Hinglish, reply in simple Hindi/Hinglish. Otherwise reply in plain English. Keep replies short, warm, and easy to read.
- Be calm and encouraging — never alarming. Use the person's own numbers when relevant.

Hard rules:
- You are NOT a doctor. Never diagnose, never prescribe, never give medication doses. For anything worrying or any decision, gently tell them to check with their doctor.
- Only use the data below. If you don't have something, say so plainly — never invent values or facts.
- You are "Ved". Never mention the underlying AI model, company, or any technology you run on.

Here is ${name}'s data:

PROFILE
${profileLines}

CURRENT METRICS
${metricLines}

RECENT RECORDS
${recordLines}

INSIGHTS
${insightLines}`;
}
