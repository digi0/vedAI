/**
 * LLM provider — Ollama-backed, INSIGHTS ONLY.
 *
 * Parsing of medical documents happens in the separate medical-parser package.
 * Ved AI receives structured ParsedRecord data and only uses the LLM for the
 * one thing it's irreplaceable at: synthesizing insights from a patient's
 * structured data.
 */

import type { ParsedDocument } from "medical-parser";
import type { Insight } from "./types";

export interface LLMProvider {
  generateInsights(ctx: PatientContext): Promise<Insight[]>;
}

export type PatientContext = {
  profile: {
    name?: string;
    dob?: string;
    bloodType?: string;
    allergies?: string[];
    conditions?: string[];
    medications?: { name: string; dose: string; frequency: string }[];
  } | null;
  records: {
    type: string;
    title: string;
    date: string;
    summary?: string;
    parsedData?: ParsedDocument | null;
  }[];
  metrics: {
    key: string;
    label: string;
    unit: string;
    healthyRange?: [number, number];
    points: { date: string; value: number }[];
  }[];
};

// ---------- Ollama ----------

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3:8b";

async function ollamaChat(args: {
  system: string;
  user: string;
  format?: "json";
}): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: args.format,
      options: { temperature: 0.2 },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.message?.content ?? "";
}

const INSIGHTS_SYSTEM = `You are a careful medical assistant generating personal-health insights.
You are NOT a doctor. Frame insights as patterns to discuss, never as diagnoses.
Return ONLY valid JSON: an array of up to 5 insights matching this schema:

[
  {
    "id": string,
    "severity": "info" | "watch" | "alert",
    "title": string,
    "detail": string,
    "suggestion": string
  }
]

Rules:
- Cite specific numbers/dates from the data ("LDL 138 in Nov 2025").
- "alert" only for documented allergies, dangerous interactions, or values far outside normal.
- "watch" for trends moving in the wrong direction.
- "info" for positive trends or steady state.
- Skip generic advice; only insights grounded in this patient's data.`;

function stripCodeFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

export class OllamaProvider implements LLMProvider {
  async generateInsights(ctx: PatientContext): Promise<Insight[]> {
    const raw = await ollamaChat({
      system: INSIGHTS_SYSTEM,
      user: `Patient data:\n\n${JSON.stringify(ctx, null, 2)}`,
      format: "json",
    });
    try {
      const parsed = JSON.parse(stripCodeFence(raw));
      return Array.isArray(parsed) ? parsed : (parsed.insights ?? []);
    } catch {
      throw new Error(`LLM returned non-JSON:\n${raw.slice(0, 400)}`);
    }
  }
}

export function getLLM(): LLMProvider {
  return new OllamaProvider();
}
