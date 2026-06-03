import "server-only";
import crypto from "node:crypto";

/**
 * Twilio WhatsApp helpers — no SDK, just crypto + fetch.
 */

/** Validate the X-Twilio-Signature on an inbound webhook. */
export function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  // Twilio signs: the full URL, then each POST param appended as name+value,
  // sorted alphabetically by name. HMAC-SHA1, base64.
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Download an inbound media file from Twilio (Basic-auth on api.twilio.com). */
export async function downloadTwilioMedia(
  mediaUrl: string,
  accountSid: string,
  authToken: string,
): Promise<ArrayBuffer> {
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
    // Twilio 307-redirects to a pre-signed media URL; undici follows it and
    // drops the Authorization header on the cross-origin hop (which is correct
    // — the redirect target is already signed).
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Media download failed: ${res.status}`);
  return res.arrayBuffer();
}

export function extFromContentType(ct?: string): string {
  if (!ct) return "bin";
  const c = ct.toLowerCase();
  if (c.includes("pdf")) return "pdf";
  if (c.includes("jpeg") || c.includes("jpg")) return "jpg";
  if (c.includes("png")) return "png";
  return "bin";
}

export function normalizePhone(from: string): string {
  return from.replace(/^whatsapp:/i, "").trim();
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

/** Build a TwiML reply (a single WhatsApp message back to the sender). */
export function twimlReply(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message,
  )}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

/** Empty TwiML (acknowledge without replying). */
export function twimlEmpty(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}
