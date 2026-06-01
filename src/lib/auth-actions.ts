"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase";

export type AuthResult = { error: string } | undefined;

function validate(email: string, password: string): string | null {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
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

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
