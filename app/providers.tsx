"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // NextAuth's client provider just reads the httpOnly session cookie on
  // each render — it does not add any storage of its own.
  return <SessionProvider>{children}</SessionProvider>;
}
