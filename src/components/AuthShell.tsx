import LanguageSwitcher from "@/components/LanguageSwitcher";

/** The framing shared by every signed-out auth screen. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="mb-4 flex justify-center">
        <LanguageSwitcher />
      </div>
      <div className="glass rounded-2xl p-6 sm:p-7">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v18M3 12h18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{subtitle}</p>
        </div>

        {children}

        {footer && (
          <p className="mt-5 text-center text-sm text-[var(--color-fg-muted)]">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

/** Labelled text input, matching the sign-in form. */
export function Field({
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

/** Red error / green confirmation banner used by the auth forms. */
export function AuthMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) {
    return (
      <div className="rounded-md bg-[var(--color-alert-soft)] px-3 py-2 text-sm text-[var(--color-alert)]">
        {state.error}
      </div>
    );
  }
  if (state?.ok) {
    return (
      <div className="rounded-md bg-[var(--color-ok-soft)] px-3 py-2 text-sm text-[var(--color-ok)]">
        {state.ok}
      </div>
    );
  }
  return null;
}
