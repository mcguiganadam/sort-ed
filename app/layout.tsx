import type { Metadata } from "next";
import { Quicksand, Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Quicksand: rounded, friendly — used for the wordmark and headings, doing
// the "supportive, not corrective" work the name SortEd is meant to carry.
// Inter: workhorse body/UI font — keeps forms, buttons, and dense task
// lists legible rather than twee. Both load as static files via next/font
// (no external request at runtime, no layout shift).
const displayFont = Quicksand({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "SortEd — consider it sorted",
  description: "Quick capture that keeps admin out of your planning block, sorted for a clear moment instead.",
  // Favicon comes from app/icon.svg via Next's file-based metadata
  // convention — no manual <link> needed here.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
