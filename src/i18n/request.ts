import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./locale";

/**
 * Resolves the active locale per request from a cookie (no [locale] route
 * segment, so existing URLs are untouched). All authed pages are already
 * dynamic, so reading cookies here is free.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  // Explicit imports (not a templated path) so Turbopack can resolve both.
  const messages =
    locale === "hi"
      ? (await import("../../messages/hi.json")).default
      : (await import("../../messages/en.json")).default;

  return { locale, messages };
});
