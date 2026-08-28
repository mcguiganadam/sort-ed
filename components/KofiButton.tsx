"use client";

// components/KofiButton.tsx
//
// Ko-fi only. No Stripe, no subscription gate, no feature is ever locked
// behind this. Every teacher gets every feature; this is a plain link out
// to Ko-fi's own hosted donate page — SortEd never touches payment data,
// card numbers, or webhooks. Set NEXT_PUBLIC_KOFI_USERNAME in .env.local.

export default function KofiButton() {
  const username = process.env.NEXT_PUBLIC_KOFI_USERNAME || "yourusername";
  return (
    <a
      href={`https://ko-fi.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-park-amber/40 bg-white px-4 py-2 text-sm font-medium text-park-amber shadow-sm transition hover:bg-park-amber hover:text-white"
    >
      <span aria-hidden>☕</span>
      Support SortEd on Ko-fi
    </a>
  );
}
