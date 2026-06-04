"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "@/lib/auth-actions";

type Tab = { href: string; key: string; icon: React.ReactNode };

const I = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5M9.5 20v-6h5v6" />
  ),
  records: <path d="M7 3h7l4 4v14H6V3h1Zm6 0v5h5M9 13h6M9 17h6" />,
  metrics: <path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6" />,
  insights: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
  ),
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  pill: <path d="M10.5 3.5a4.95 4.95 0 0 1 7 7l-7 7a4.95 4.95 0 0 1-7-7l7-7ZM7 7l7 7" />,
  emergency: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10ZM12 9v4M10 11h4" />,
  share: <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

const tabs: Tab[] = [
  { href: "/", key: "home", icon: I.home },
  { href: "/records", key: "records", icon: I.records },
  { href: "/metrics", key: "metrics", icon: I.metrics },
  { href: "/insights", key: "insights", icon: I.insights },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const moreActive = ["/pharmacy", "/emergency", "/share"].some((p) =>
    pathname.startsWith(p),
  );

  return (
    <>
      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                  active
                    ? "text-[var(--color-brand)]"
                    : "text-[var(--color-fg-dim)]"
                }`}
              >
                <Icon>{tab.icon}</Icon>
                {t(tab.key)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t("more")}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
              moreActive || moreOpen
                ? "text-[var(--color-brand)]"
                : "text-[var(--color-fg-dim)]"
            }`}
          >
            <Icon>{I.more}</Icon>
            {t("more")}
          </button>
        </div>
      </nav>

      {/* ── "More" sheet ── */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          moreOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!moreOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMoreOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            moreOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Panel */}
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 transition-transform duration-250 ease-out ${
            moreOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-[var(--color-border-strong)]" />
          <div className="px-3 py-2">
            <SheetLink href="/pharmacy" label={t("pharmacy")} icon={I.pill} onClick={() => setMoreOpen(false)} />
            <SheetLink
              href="/emergency"
              label={t("emergencyCard")}
              icon={I.emergency}
              tone="alert"
              onClick={() => setMoreOpen(false)}
            />
            <SheetLink href="/share" label={t("shareWithDoctor")} icon={I.share} onClick={() => setMoreOpen(false)} />
            <div className="my-2 h-px bg-[var(--color-border)]" />
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[var(--color-fg)] active:bg-[var(--color-surface-2)]"
              >
                <span className="text-[var(--color-fg-muted)]">
                  <Icon>{I.logout}</Icon>
                </span>
                <span className="font-medium">{t("signOut")}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function SheetLink({
  href,
  label,
  icon,
  tone,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone?: "alert";
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 active:bg-[var(--color-surface-2)]"
    >
      <span
        className={
          tone === "alert"
            ? "text-[var(--color-alert)]"
            : "text-[var(--color-fg-muted)]"
        }
      >
        <Icon>{icon}</Icon>
      </span>
      <span
        className={`font-medium ${
          tone === "alert" ? "text-[var(--color-alert)]" : "text-[var(--color-fg)]"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
