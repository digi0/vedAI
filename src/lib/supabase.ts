/**
 * Supabase clients.
 *
 *   supabaseServer()   — cookie-bound, per-request. Reads the logged-in
 *                        user's session. Subject to RLS. Use for all
 *                        user-scoped reads/writes in server components &
 *                        server actions.
 *   serverAdmin()      — service_role, bypasses RLS. Use ONLY for
 *                        intentionally cross-user, token-gated reads
 *                        (the doctor share view) and admin tasks.
 *   browserClient()    — anon key, for client components if ever needed.
 *   getSessionUser()   — convenience: the current auth user or null.
 *   requireUserId()    — the current user's id, or throws (use in actions).
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser-side client — anon key, RLS-enforced. */
export function browserClient() {
  return createBrowserClient(url, anonKey);
}

/**
 * Cookie-bound server client. Reads/writes the Supabase auth session from
 * the Next cookie store. RLS applies — queries only see the caller's rows.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The middleware refreshes the session cookie instead.
        }
      },
    },
  });
}

/** The current authenticated user, or null. */
export async function getSessionUser() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

/** The current user's id, or throw. Use inside server actions. */
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

/**
 * Service-role client (bypasses RLS). Only for cross-user, token-gated
 * reads (doctor share view) and admin operations. Never expose to client.
 */
export function serverAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
