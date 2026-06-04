import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Ved AI — your health, in one place",
  description:
    "Your personal health intelligence. Records, metrics, insights, and a one-tap share for emergencies.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ved AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ved AI",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // viewport-fit=cover is what makes env(safe-area-inset-*) work on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

// Applies the saved/system theme to <html> before first paint (no flash).
const themeScript = `(function(){try{var e=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(e==='dark'||(!e&&m)){document.documentElement.classList.add('dark');}}catch(_){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Nav />
          {/* Bottom padding clears the mobile tab bar (+ iOS home indicator). */}
          <main className="mx-auto max-w-6xl px-5 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:py-12 md:pb-12">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
