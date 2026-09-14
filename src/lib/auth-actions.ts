"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase";
import { safeNextPath } from "./auth-paths";
import {
  isValidEmail,
  validateNewPassword,
  MIN_PASSWORD_LENGTH,
} from "./password";

/** `error` renders red, `ok` renders as a confirmation. Neither means idle. */
export type AuthResult = { error?: string; ok?: string } | undefined;

function validate(email: string, password: string): string | null {
  if (!email || !isValidEmail(email)) {
    return "Enter a valid email address.";
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/** This deployment's origin, for links we ask Supabase to mail out. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  const invalid = validate(email, password);
  if (invalid) return { error: invalid };

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // With email confirmation OFF, a session is returned immediately. If it's
  // not, the project still has confirmation ON — tell the user.
  if (!data.session) {
    return {
      error:
        "Account created — check your email to confirm, then sign in. " +
        "(To allow instant signup, disable email confirmation in Supabase → Authentication → Providers → Email.)",
    };
  }

  // Seed an (empty) profile row for the new user.
  const userId = data.user?.id;
  if (userId) {
    await sb.from("profiles").upsert(
      { user_id: userId, full_name: fullName },
      { onConflict: "user_id" },
    );
  }

  redirect("/");
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";

  if (!email || !password) return { error: "Email and password are required." };

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(safeNextPath(next));
}

/**
 * Mail a password-reset link.
 *
 * The reply is the same whether or not the address has an account: telling a
 * stranger which emails are registered here would leak who uses a medical app.
 */
export async function requestPasswordReset(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const sb = await supabaseServer();
  const origin = await siteOrigin();
  await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  return { ok: "If that email has an account, a reset link is on its way." };
}

/**
 * Set a new password for the user the recovery link signed in.
 *
 * Reachable only with a session, so the recovery link itself is the proof of
 * identity — /auth/confirm establishes it before redirecting here.
 */
export async function updatePassword(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const problem = validateNewPassword(password, confirm);
  if (problem === "too_short") {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (problem === "mismatch") {
    return { error: "The two passwords don't match." };
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { error: "That reset link has expired. Request a new one." };
  }

  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/");
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
