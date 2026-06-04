import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/lib/supabase";
import { buildVedSystemPrompt } from "@/lib/ved";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("Ved isn't configured on this environment.", { status: 503 });
  }

  let payload: { messages?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Sanitize: keep only well-formed user/assistant turns, cap history length.
  const convo: ChatMessage[] = (Array.isArray(payload.messages) ? payload.messages : [])
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-20);

  if (convo.length === 0 || convo[convo.length - 1].role !== "user") {
    return new Response("Bad request", { status: 400 });
  }

  const system = await buildVedSystemPrompt();
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

  const stream = client.messages.stream({
    model,
    max_tokens: 1024,
    system,
    messages: convo,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        console.error("[ved] stream error:", e);
        controller.enqueue(encoder.encode("\n\n(Sorry — I hit a snag. Try again?)"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
