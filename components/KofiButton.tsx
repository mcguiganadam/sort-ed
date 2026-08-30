"use client";

// components/KofiButton.tsx
//
// Ko-fi only. No Stripe, no subscription gate, no feature is ever locked
// behind this. Every teacher gets every feature; this is a plain link out
// to Ko-fi's own hosted donate page — SortEd never touches payment data,
// card numbers, or webhooks. Set NEXT_PUBLIC_KOFI_USERNAME in .env.local.
//
// Restyled for the Modernist system (2026-08-30, Adam): flat-accent blue
// (same as the hero's "Sign in with Google" / Quick Capture's "Sort it"
// buttons), zero border-radius, no coffee emoji, no "on Ko-fi" suffix --
// the old rounded amber pill didn't match the flat system.

export default function KofiButton() {
  const username = process.env.NEXT_PUBLIC_KOFI_USERNAME || "yourusername";
  return (
    <a
      href={`https://ko-fi.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center bg-flat-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-flat-accent-700"
    >
      Support SortEd
    </a>
  );
}
