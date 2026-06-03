import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ved AI — your health, in one place",
  description:
    "Your personal health intelligence. Records, metrics, insights, and a one-tap share for emergencies.",
};

// Applies the saved/system theme to <html> before first paint, so there's
// no light-mode flash. Kept tiny and dependency-free; runs synchronously.
const themeScript = `(function(){try{var e=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(e==='dark'||(!e&&m)){document.documentElement.classList.add('dark');}}catch(_){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">{children}</main>
      </body>
    </html>
  );
}
