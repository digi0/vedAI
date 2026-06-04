import { after } from "next/server";
import { serverAdmin } from "@/lib/supabase";
import { ingestDocumentBytes } from "@/lib/ingest";
import {
  verifyMetaSignature,
  parseInbound,
  downloadMetaMedia,
  sendWhatsappText,
  extFromMime,
  type InboundMessage,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";

/** Meta webhook verification handshake (run once when you set the callback URL). */
export function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (APP_SECRET) {
    const ok = verifyMetaSignature(APP_SECRET, req.headers.get("x-hub-signature-256"), raw);
    if (!ok) {
      console.warn("[whatsapp] signature validation failed");
      return new Response("invalid signature", { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const msg = parseInbound(body);
  // Ack immediately so Meta doesn't retry; do the slow work (download/parse/
  // reply) after the response.
  if (msg) {
    after(async () => {
      try {
        await handleMessage(msg);
      } catch (e) {
        console.error("[whatsapp] handler error:", e);
      }
    });
  }
  return new Response("ok", { status: 200 });
}

async function handleMessage(msg: NonNullable<InboundMessage>) {
  const sb = serverAdmin();
  const reply = (text: string) =>
    sendWhatsappText({
      phoneNumberId: PHONE_NUMBER_ID,
      token: ACCESS_TOKEN,
      to: msg.from,
      body: text,
    });

  // ── Media → ingest into the linked account ──
  if (msg.kind === "media") {
    const { data: link } = await sb
      .from("whatsapp_links")
      .select("user_id")
      .eq("phone", msg.from)
      .maybeSingle();

    if (!link) {
      await reply(
        "👋 I don't recognize this number yet. Open Ved AI → Records → " +
          "Link WhatsApp, and send me the 6-character code shown there.",
      );
      return;
    }

    const ext = extFromMime(msg.mime);
    if (ext === "bin") {
      await reply("I can take PDF lab reports/prescriptions (and photos). That file type isn't supported yet.");
      return;
    }

    try {
      const { bytes } = await downloadMetaMedia(msg.mediaId, ACCESS_TOKEN);
      const out = await ingestDocumentBytes({
        userId: link.user_id,
        bytes,
        fileName: msg.filename || `whatsapp-${Date.now()}.${ext}`,
      });
      await reply(
        out.parsed
          ? `✅ Added "${out.title}".` +
              (out.labValues > 0 ? ` ${out.labValues} values tracked.` : "") +
              " Open Ved AI to see it in your vault."
          : "📄 Saved to your vault, but I couldn't auto-read it — it's marked 'Pending review.' (PDFs parse best.)",
      );
    } catch (e) {
      console.error("[whatsapp] ingest failed:", e);
      await reply("Something went wrong saving that file. Please try again in a moment.");
    }
    return;
  }

  // ── Text ──
  if (msg.kind === "text") {
    const code = msg.text.trim().toUpperCase().replace(/\s+/g, "");
    if (/^[A-Z0-9]{6}$/.test(code)) {
      const { data: codeRow } = await sb
        .from("whatsapp_link_codes")
        .select("user_id, expires_at")
        .eq("code", code)
        .maybeSingle();

      if (codeRow && new Date(codeRow.expires_at) > new Date()) {
        await sb
          .from("whatsapp_links")
          .upsert({ phone: msg.from, user_id: codeRow.user_id }, { onConflict: "phone" });
        await sb.from("whatsapp_link_codes").delete().eq("code", code);
        await reply(
          "✅ Linked to your Ved AI account! Forward any lab report or " +
            "prescription here and I'll add it to your vault.",
        );
        return;
      }
      await reply(
        "That code is invalid or expired. Open Ved AI → Records → Link WhatsApp for a fresh one.",
      );
      return;
    }

    const { data: link } = await sb
      .from("whatsapp_links")
      .select("user_id")
      .eq("phone", msg.from)
      .maybeSingle();
    await reply(
      link
        ? "Forward me a lab report or prescription (PDF works best) and I'll add it to your vault. 📎"
        : "👋 I'm the Ved AI assistant. To link this number, open Ved AI → Records → " +
            "Link WhatsApp and send me the 6-character code.",
    );
  }
}
