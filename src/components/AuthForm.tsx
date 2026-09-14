"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn, signUp, type AuthResult } from "@/lib/auth-actions";
import AuthShell, { Field, AuthMessage } from "@/components/AuthShell";

export default function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: "login" | "signup";
  next?: string;
  /** Pre-filled message, e.g. after an expired recovery link. */
  notice?: string;
}) {
  const t = useTranslations("auth");
  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    action,
    notice ? { error: notice } : undefined,
  );

  return (
    <AuthShell
      title={mode === "signup" ? t("createTitle") : t("welcomeTitle")}
      subtitle={mode === "signup" ? t("createSub") : t("loginSub")}
      footer={
        mode === "signup" ? (
          <>
            {t("alreadyHave")}{" "}
            <Link href="/login" className="text-[var(--color-brand)] hover:underline">
              {t("signInLink")}
            </Link>
          </>
        ) : (
          <>
            {t("newHere")}{" "}
            <Link href="/signup" className="text-[var(--color-brand)] hover:underline">
              {t("createLink")}
            </Link>
          </>
        )
      }
    >
      <form action={formAction} className="space-y-3">
        {next && <input type="hidden" name="next" value={next} />}

        {mode === "signup" && (
          <Field
            label={t("fullName")}
            name="fullName"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
          />
        )}
        <Field
          label={t("email")}
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label={t("password")}
          name="password"
          type="password"
          placeholder={mode === "signup" ? t("passwordHintSignup") : "••••••••"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />

        {mode === "login" && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--color-brand)] hover:underline"
            >
              {t("forgotLink")}
            </Link>
          </div>
        )}

        <AuthMessage state={state} />

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "…" : mode === "signup" ? t("createBtn") : t("signInBtn")}
        </button>
      </form>
    </AuthShell>
  );
}
