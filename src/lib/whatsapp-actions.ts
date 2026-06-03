"use server";

import { serverAdmin, requireUserId } from "./supabase";

/** Status of the current user's WhatsApp link, for rendering the UI. */
export async function getWhatsappStatus(): Promise<{
  linkedPhone: string | null;
}> {
  const userId = await requireUserId();
  const sb = serverAdmin();
  const { data } = await sb
    .from("whatsapp_links")
    .select("phone")
    .eq("user_id", userId)
    .maybeSingle();
  return { linkedPhone: data?.phone ?? null };
}

function genCode(): string {
  // 6 chars, unambiguous alphabet (no 0/O/1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Generate (or refresh) a one-time link code for the current user. */
export async function createWhatsappLinkCode(): Promise<{ code: string }> {
  const userId = await requireUserId();
  const sb = serverAdmin();
  // Clear any prior pending codes for this user, then mint a fresh one.
  await sb.from("whatsapp_link_codes").delete().eq("user_id", userId);
  const code = genCode();
  const { error } = await sb
    .from("whatsapp_link_codes")
    .insert({ user_id: userId, code });
  if (error) throw new Error(error.message);
  return { code };
}

export async function unlinkWhatsapp(): Promise<void> {
  const userId = await requireUserId();
  const sb = serverAdmin();
  await sb.from("whatsapp_links").delete().eq("user_id", userId);
}
