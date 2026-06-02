/**
 * Browser-only Supabase client. Kept separate from lib/supabase.ts because
 * that module imports next/headers (server-only) — importing it into a
 * client component would break the build. This file has no server imports
 * and is safe to use from "use client" components.
 */

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function browserClient() {
  return createBrowserClient(url, anonKey);
}
