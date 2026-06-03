import { serverAdmin } from "@/lib/supabase";
import { ingestDocumentBytes } from "@/lib/ingest";
import {
  validateTwilioSignature,
  downloadTwilioMedia,
  extFromContentType,
  normalizePhone,
  twimlReply,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
// Parsing a PDF can take a few seconds — give the function headroom.
export const maxDuration = 30;

const SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";

function reconstructUrl(req: Request): string {
  if (process.env.TWILIO_WEBHOOK_URL) return process.env.TWILIO_WEBHOOK_URL;
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  return `${proto}://${host}${u.pathname}`;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  // Verify the request really came from Twilio (skipped only if no token set).
  if (TOKEN) {
    const ok = validateTwilioSignature(
      TOKEN,
      req.headers.get("x-twilio-signature"),
      reconstructUrl(req),
      params,
    );
    if (!ok) {
      console.warn("[whatsapp] signature validation failed");
      return new Response("invalid signature", { status: 403 });
    }
  }

  const phone = normalizePhone(params.From ?? "");
  const body = (params.Body ?? "").trim();
  const numMedia = parseInt(params.NumMedia ?? "0", 10) || 0;
  const sb = serverAdmin();

  // ── Media message → ingest into the linked account ──
  if (numMedia > 0) {
    const { data: link } = await sb
      .from("whatsapp_links")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (!link) {
      return twimlReply(
        "👋 I don't recognize this number yet. Open Ved AI → Records → " +
          "Link WhatsApp, and send me the 6-character code shown there.",
      );
    }

    const mediaUrl = params.MediaUrl0;
    const ct = params.MediaContentType0;
    const ext = extFromContentType(ct);
    if (!mediaUrl || ext === "bin") {
      return twimlReply(
        "I can take PDF lab reports/prescriptions (and photos). That file type isn't supported yet.",
      );
    }

    try {
      const bytes = await downloadTwilioMedia(mediaUrl, SID, TOKEN);
      const fileName = `whatsapp-${Date.now()}.${ext}`;
      const out = await ingestDocumentBytes({
        userId: link.user_id,
        bytes,
        fileName,
      });
      if (out.parsed) {
        return twimlReply(
          `✅ Added "${out.title}".` +
            (out.labValues > 0 ? ` ${out.labValues} values tracked.` : "") +
            " Open Ved AI to see it in your vault.",
        );
      }
      return twimlReply(
        "📄 Saved to your vault, but I couldn't auto-read it — it's marked " +
          "'Pending review.' (PDFs parse best.)",
      );
    } catch (e) {
      console.error("[whatsapp] ingest failed:", e);
      return twimlReply(
        "Something went wrong saving that file. Please try again in a moment.",
      );
    }
  }

  // ── Text message ──
  // Is it a pending link code? (6 alphanumerics)
  const maybeCode = body.toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z0-9]{6}$/.test(maybeCode)) {
    const { data: codeRow } = await sb
      .from("whatsapp_link_codes")
      .select("user_id, expires_at")
      .eq("code", maybeCode)
      .maybeSingle();

    if (codeRow && new Date(codeRow.expires_at) > new Date()) {
      await sb
        .from("whatsapp_links")
        .upsert({ phone, user_id: codeRow.user_id }, { onConflict: "phone" });
      await sb.from("whatsapp_link_codes").delete().eq("code", maybeCode);
      return twimlReply(
        "✅ Linked to your Ved AI account! Forward any lab report or " +
          "prescription here and I'll add it to your vault.",
      );
    }
    return twimlReply(
      "That code is invalid or expired. Open Ved AI → Records → Link WhatsApp for a fresh one.",
    );
  }

  // Linked already?
  const { data: link } = await sb
    .from("whatsapp_links")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (link) {
    return twimlReply(
      "Forward me a lab report or prescription (PDF works best) and I'll add it to your vault. 📎",
    );
  }
  return twimlReply(
    "👋 I'm the Ved AI assistant. To link this number, open Ved AI → Records → " +
      "Link WhatsApp and send me the 6-character code.",
  );
}
