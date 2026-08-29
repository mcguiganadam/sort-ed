"use client";

// components/GoogleSignInButton.tsx
//
// Google's official "Sign in with Google" button, per their branding
// guidelines (https://developers.google.com/identity/branding-guidelines):
// white background, light grey border, the standard multicolour "G" mark,
// medium-weight label. The mark is inlined as SVG (Google's well-known
// public G-logo path data) rather than hotlinked from an external asset,
// so it renders reliably with no dependency on a third-party image host.
//
// This intentionally still calls next-auth's signIn("google") underneath
// rather than switching to Google's Identity Services JS widget — the
// existing OAuth redirect flow (with NextAuth's CSRF-protected state)
// already works end to end; only the button's appearance changes here.

import { signIn } from "next-auth/react";

export default function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="inline-flex items-center gap-2 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow focus:outline-none focus:ring-2 focus:ring-[#4285f4]/40"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
