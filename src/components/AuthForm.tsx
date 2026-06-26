"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn, signUp, type AuthResult } from "@/lib/auth-actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const t = useTranslations("auth");
  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    action,
    undefined,
  );

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="mb-4 flex justify-center">
        <LanguageSwitcher />
      </div>
      <div className="glass rounded-2xl p-6 sm:p-7">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-3xl">
          {mode === "signup" ? t("createTitle") : t("welcomeTitle")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {mode === "signup" ? t("createSub") : t("loginSub")}
        </p>
      </div>

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

        {state?.error && (
          <div className="rounded-md bg-[var(--color-alert-soft)] px-3 py-2 text-sm text-[var(--color-alert)]">
            {state.error}
          </div>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending
            ? "…"
            : mode === "signup"
              ? t("createBtn")
              : t("signInBtn")}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--color-fg-muted)]">
        {mode === "signup" ? (
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
        )}
      </p>
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-fg-muted)]">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-brand)]"
      />
    </label>
  );
}
