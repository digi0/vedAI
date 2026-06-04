/**
 * Locale config shared by the request handler, the language switcher, and the
 * cookie helpers. No server-only imports here so it's safe on the client too.
 */
export const locales = ["en", "hi"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

/** Cookie the language switcher writes and the request config reads. */
export const LOCALE_COOKIE = "ved_locale";

export const localeNames: Record<AppLocale, string> = {
  en: "English",
  hi: "हिंदी",
};

export function isLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}
