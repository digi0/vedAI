"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { requestPasswordReset, type AuthResult } from "@/lib/auth-actions";
import AuthShell, { Field, AuthMessage } from "@/components/AuthShell";

export default function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <AuthShell
      title={t("forgotTitle")}
      subtitle={t("forgotSub")}
      footer={
        <>
          {t("rememberedPassword")}{" "}
          <Link href="/login" className="text-[var(--color-brand)] hover:underline">
            {t("signInLink")}
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-3">
        <Field
          label={t("email")}
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <AuthMessage state={state} />

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "…" : t("sendResetBtn")}
        </button>
      </form>
    </AuthShell>
  );
}
