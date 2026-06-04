import "server-only";
import crypto from "node:crypto";

/**
 * Meta WhatsApp Cloud API helpers — no SDK, just crypto + fetch.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH = "https://graph.facebook.com/v21.0";

/** Verify the X-Hub-Signature-256 header (HMAC-SHA256 of the raw body, App Secret). */
export function verifyMetaSignature(
  appSecret: string,
  header: string | null,
  rawBody: string,
): boolean {
  if (!header) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

export type InboundMessage =
  | { kind: "text"; from: string; text: string }
  | { kind: "media"; from: string; mediaId: string; mime: string; filename?: string }
  | { kind: "other"; from: string }
  | null;

/** Pull the first message out of a Cloud API webhook payload. */
export function parseInbound(body: unknown): InboundMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = (body as any)?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return null; // delivery/read status update, or nothing actionable

  // Cloud API sends `from` as a bare wa_id (digits, no +). Normalize to E.164.
  const from = "+" + String(msg.from).replace(/^\+/, "");

  if (msg.type === "text") {
    return { kind: "text", from, text: msg.text?.body ?? "" };
  }
  if (msg.type === "document" && msg.document?.id) {
    return {
      kind: "media",
      from,
      mediaId: msg.document.id,
      mime: msg.document.mime_type ?? "",
      filename: msg.document.filename,
    };
  }
  if (msg.type === "image" && msg.image?.id) {
    return { kind: "media", from, mediaId: msg.image.id, mime: msg.image.mime_type ?? "" };
  }
  return { kind: "other", from };
}

/** Two-step media fetch: media-id → CDN url → bytes (both need the Bearer token). */
export async function downloadMetaMedia(
  mediaId: string,
  token: string,
): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) throw new Error(`media metadata ${metaRes.status}`);
  const meta = (await metaRes.json()) as { url: string; mime_type?: string };

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) throw new Error(`media download ${fileRes.status}`);
  return { bytes: await fileRes.arrayBuffer(), mime: meta.mime_type ?? "" };
}

/** Send a free-form text reply (valid inside the 24h customer-service window). */
export async function sendWhatsappText(opts: {
  phoneNumberId: string;
  token: string;
  to: string;
  body: string;
}): Promise<void> {
  const res = await fetch(`${GRAPH}/${opts.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: opts.to.replace(/^\+/, ""),
      type: "text",
      text: { body: opts.body },
    }),
  });
  if (!res.ok) {
    console.error("[whatsapp] send failed", res.status, await res.text().catch(() => ""));
  }
}

export function extFromMime(mime?: string): string {
  if (!mime) return "bin";
  const c = mime.toLowerCase();
  if (c.includes("pdf")) return "pdf";
  if (c.includes("jpeg") || c.includes("jpg")) return "jpg";
  if (c.includes("png")) return "png";
  return "bin";
}
