import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

/**
 * Reached only through /auth/confirm, which signs the user in from the
 * emailed token. Without that session there is nothing to reset, so send
 * them back to ask for a fresh link.
 */
export default async function ResetPasswordPage() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");

  return <ResetPasswordForm />;
}
