import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/records", label: "Records" },
  { href: "/metrics", label: "Metrics" },
  { href: "/insights", label: "Insights" },
  { href: "/pharmacy", label: "Pharmacy" },
  { href: "/emergency", label: "Emergency" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-brand)] text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v18M3 12h18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-display text-xl">Ved AI</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/share"
            className="ml-2 rounded-md bg-[var(--color-brand)] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-strong)]"
          >
            Share with doctor
          </Link>
        </nav>
      </div>
    </header>
  );
}
