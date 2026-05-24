/**
 * Supabase clients.
 *
 *   browserClient()  — anon key, runs in the browser. Subject to RLS.
 *   serverClient()   — service_role key, runs ONLY in server components,
 *                      route handlers, and server actions. Bypasses RLS.
 *
 * During the pre-auth demo phase we use serverClient() with DEMO_USER_ID
 * for every write. Once auth lands, we'll switch most calls to the
 * browser client and let RLS enforce ownership.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

/** Browser-side client — anon key, RLS-enforced. */
export function browserClient() {
  return createBrowserClient(url, anonKey);
}

/**
 * Server-side admin client (service_role).
 * Only import from server components, route handlers, or server actions.
 * Never re-export to the client.
 */
export function serverAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-side anon client with cookie-based session (for when auth lands).
 * Returns the same shape as the browser client but reads/writes the
 * session from the Next cookie store. Stubbed cookie adapter for now.
 */
export function serverAnon() {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
