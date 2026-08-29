// lib/googleToken.ts
//
// Google access tokens expire (usually after 1 hour). lib/auth.ts's own
// jwt() callback never gets a chance to refresh them for the API routes
// below: getToken() (used by app/api/gmail/scan and app/api/calendar/freebusy)
// reads the session cookie directly and does NOT invoke callbacks.jwt —
// that only runs when NextAuth's own handler builds a session. The result
// was a token that silently went stale about an hour after connecting,
// producing an opaque "Gmail API error" with no explanation.
//
// This refreshes the access token directly against Google's token endpoint
// using the refresh token already stored in the cookie (available because
// lib/auth.ts requests access_type: "offline" + prompt: "consent" on first
// connect), and hands back an updated, re-encrypted cookie value so the
// route can attach it to its response — the browser's *next* request then
// already has a fresh token, instead of refreshing on every single call.

import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const EXPIRY_BUFFER_SECONDS = 60;
const SESSION_COOKIE_NAMES = ["__Secure-next-auth.session-token", "next-auth.session-token"];

export interface GoogleTokenResult {
  accessToken: string | null;
  /** Set on the response when the route gets a usable token, so the browser's next request already has it. */
  refreshedCookie?: { name: string; value: string };
  error?: "not_connected" | "expired_no_refresh_token" | "refresh_failed";
}

export async function getValidGoogleAccessToken(
  req: NextRequest,
  rawToken: Record<string, any>
): Promise<GoogleTokenResult> {
  const accessToken = rawToken.googleAccessToken as string | undefined;
  const refreshToken = rawToken.googleRefreshToken as string | undefined;
  const expiresAt = rawToken.googleExpiresAt as number | undefined;

  if (!accessToken) return { accessToken: null, error: "not_connected" };

  const stillValid = typeof expiresAt === "number" && Date.now() / 1000 < expiresAt - EXPIRY_BUFFER_SECONDS;
  if (stillValid) return { accessToken };

  if (!refreshToken) {
    // Expired with nothing to refresh with — happens for a grant made
    // before this refresh logic existed. The teacher needs to reconnect
    // Google once to pick up a refresh token; after that this keeps
    // working silently.
    return { accessToken: null, error: "expired_no_refresh_token" };
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    return { accessToken: null, error: "refresh_failed" };
  }

  const refreshed = await res.json();
  const newAccessToken: string = refreshed.access_token;
  const newExpiresAt = Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600);

  const updatedToken = {
    ...rawToken,
    googleAccessToken: newAccessToken,
    googleExpiresAt: newExpiresAt,
    // Google doesn't normally rotate the refresh token on a plain refresh —
    // keep the existing one unless a new one actually came back.
    googleRefreshToken: refreshed.refresh_token ?? refreshToken,
  };

  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const cookieValue = await encode({ token: updatedToken, secret });

  // Write back to whichever cookie name this request actually carried
  // (Secure-prefixed on the https production domain, unprefixed in local
  // dev) rather than guessing from an env var.
  const cookieName = SESSION_COOKIE_NAMES.find((name) => req.cookies.get(name)) ?? SESSION_COOKIE_NAMES[0];

  return { accessToken: newAccessToken, refreshedCookie: { name: cookieName, value: cookieValue } };
}

// Attaches a refreshed session cookie (if one was produced) to an outgoing
// response — small helper so every call site doesn't repeat the same
// three lines of cookie option boilerplate.
export function withRefreshedCookie(response: NextResponse, result: GoogleTokenResult): NextResponse {
  if (result.refreshedCookie) {
    response.cookies.set({
      name: result.refreshedCookie.name,
      value: result.refreshedCookie.value,
      httpOnly: true,
      secure: result.refreshedCookie.name.startsWith("__Secure-"),
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}
