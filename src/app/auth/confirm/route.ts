import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { safeNextPath } from "@/lib/auth-paths";

export const dynamic = "force-dynamic";

/**
 * Landing point for the links Supabase mails out (password recovery today,
 * email confirmation if it's ever switched on).
 *
 * Exchanging the token here rather than in the browser means the session
 * cookie is set server-side, so the page we forward to is already signed in.
 *
 * Two link shapes reach us, depending on how the project's email template is
 * written, so both are accepted:
 *   ?code=...                    PKCE — the default @supabase/ssr flow
 *   ?token_hash=...&type=...     templates using {{ .TokenHash }}
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // `next` rides in on a URL an email client handed us — never trust it raw.
  const next = safeNextPath(searchParams.get("next"));

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const sb = await supabaseServer();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
}
