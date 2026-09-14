"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword, type AuthResult } from "@/lib/auth-actions";
import AuthShell, { Field, AuthMessage } from "@/components/AuthShell";

export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    updatePassword,
    undefined,
  );

  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSub")}>
      <form action={formAction} className="space-y-3">
        <Field
          label={t("newPassword")}
          name="password"
          type="password"
          placeholder={t("passwordHintSignup")}
          autoComplete="new-password"
          required
        />
        <Field
          label={t("confirmPassword")}
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        <AuthMessage state={state} />

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "…" : t("resetBtn")}
        </button>
      </form>
    </AuthShell>
  );
}
