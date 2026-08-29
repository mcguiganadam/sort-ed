// lib/auth.ts
//
// ── WHY THIS FILE HAS NO DATABASE ─────────────────────────────────────────
// NextAuth normally persists users/sessions/accounts to a database. We
// deliberately use the "JWT strategy" instead: the session (including the
// Gmail/Calendar/Slack access tokens) is encrypted and signed with
// NEXTAUTH_SECRET and handed to the browser as an httpOnly cookie. Nothing
// is written to a database, a file, or any server-side store — Vercel's
// serverless functions don't even have a disk to write to. When the cookie
// expires or the user signs out, the tokens are gone. That's the whole
// "cannot store data" requirement, satisfied by *not building a database*
// rather than by promising to delete rows from one.
//
// Trade-off worth knowing: because there's no server-side session store,
// signing out of SortEd does not revoke the Google/Slack grant itself.
// Teachers who want to fully revoke access should also remove SortEd from
// https://myaccount.google.com/permissions and their Slack "Apps" settings.
// The README explains this to users in plain language.
// ───────────────────────────────────────────────────────────────────────────

import { NextAuthOptions } from "next-auth";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";
import GoogleProvider from "next-auth/providers/google";

// ── WHY WE MANUALLY RE-READ THE OLD SESSION COOKIE ──────────────────────────
// NextAuth rebuilds the JWT from scratch on every sign-in: the `token`
// handed to the jwt() callback below starts as just
// { name, email, picture, sub } from whichever provider you just used —
// it does NOT carry forward whatever the previous session cookie had in it.
// That's fine for a single provider, but SortEd lets a teacher connect
// Google *and* Slack independently, and without a database there's nowhere
// else to remember "I already had a Google token" once a fresh Slack
// sign-in overwrites the cookie. So before layering on the new provider's
// tokens, we read the still-valid *previous* session cookie straight off
// the request (this route runs inside a normal Next.js request, so
// next/headers' cookies() works here) and decode it with the same secret
// NextAuth already uses, purely to carry its custom fields forward. No
// extra storage, no database — just not throwing away what the cookie
// already told us a moment ago.
async function previousSessionToken(): Promise<Record<string, any> | null> {
  try {
    const store = cookies();
    const raw =
      store.get("__Secure-next-auth.session-token")?.value ??
      store.get("next-auth.session-token")?.value;
    if (!raw || !process.env.NEXTAUTH_SECRET) return null;
    const decoded = await decode({ token: raw, secret: process.env.NEXTAUTH_SECRET });
    return decoded ?? null;
  } catch {
    // Missing, expired, or undecodable cookie — just means there's no
    // prior session to carry forward, not an error worth surfacing.
    return null;
  }
}

// Minimal, read-only scopes only. No gmail.send, no gmail.compose, no
// calendar.events (write). Drafting replies happens client-side via a
// mailto: link the teacher reviews and sends themselves — SortEd never
// gets send access to anyone's account.
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// Slack doesn't fit NextAuth's built-in "Sign in with Slack" provider
// cleanly once you need read scopes beyond identity, so it's configured
// here as a generic OAuth2 provider hitting Slack's v2 endpoints directly,
// requesting a *user token* (not a bot token) scoped to read-only history.
const SLACK_USER_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "im:history",
  "mpim:history",
].join(",");

function SlackProvider() {
  return {
    id: "slack",
    name: "Slack",
    type: "oauth" as const,
    authorization: {
      url: "https://slack.com/oauth/v2/authorize",
      // NextAuth defaults `scope` to "openid" when it's left unset, which
      // Slack's v2 authorize endpoint treats as a *bot* token scope. This
      // app deliberately has no Bot Token Scopes configured (see README —
      // SortEd only ever requests a user token), so an implicit "openid"
      // bot scope makes Slack reject the whole request with "Invalid
      // permissions requested". Setting scope to "" explicitly overrides
      // NextAuth's default instead of merging with it.
      params: { scope: "", user_scope: SLACK_USER_SCOPES },
    },
    token: "https://slack.com/api/oauth.v2.access",
    userinfo: {
      url: "https://slack.com/api/users.identity",
      // Because we deliberately request zero bot scopes (see the empty
      // `scope` above), Slack's token response has no top-level
      // `access_token` — only `authed_user.access_token`. NextAuth's
      // default userinfo fetch (openid-client's requestResource) assumes
      // `tokens.access_token` exists and throws "access_token not present
      // in TokenSet" before it ever makes a request. Supplying our own
      // `request` bypasses that assumption and calls Slack directly with
      // the user token we actually have.
      async request({ tokens }: { tokens: any }) {
        const userToken = tokens.authed_user?.access_token ?? tokens.access_token;
        const res = await fetch("https://slack.com/api/users.identity", {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        return res.json();
      },
    },
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    checks: ["state" as const],
    profile(profile: any) {
      return {
        id: profile.user?.id ?? profile.authed_user?.id ?? "slack-user",
        name: profile.user?.name ?? null,
        email: profile.user?.email ?? null,
        image: profile.user?.image_192 ?? null,
      };
    },
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    SlackProvider() as any,
  ],
  callbacks: {
    // Runs only inside the serverless function, never persisted — the
    // return value is what gets encrypted into the session cookie.
    async jwt({ token, account }) {
      if (account) {
        // Carry forward whatever the OTHER provider already had connected
        // — see previousSessionToken() above for why this is necessary.
        // Each field is only pulled forward if this fresh token doesn't
        // already have it, so a re-connect of the same provider below
        // still wins with its own new tokens.
        const previous = await previousSessionToken();
        if (previous) {
          token.googleAccessToken ??= previous.googleAccessToken;
          token.googleRefreshToken ??= previous.googleRefreshToken;
          token.googleExpiresAt ??= previous.googleExpiresAt;
          token.slackUserToken ??= previous.slackUserToken;
        }
        if (account.provider === "google") {
          token.googleAccessToken = account.access_token;
          token.googleRefreshToken = account.refresh_token;
          token.googleExpiresAt = account.expires_at;
        }
        if (account.provider === "slack") {
          // Slack's v2 OAuth response nests the user token under
          // `authed_user` when `user_scope` is requested.
          const authedUser = (account as any).authed_user;
          token.slackUserToken = authedUser?.access_token ?? account.access_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).googleConnected = Boolean(token.googleAccessToken);
      (session as any).slackConnected = Boolean(token.slackUserToken);
      // Tokens are intentionally NOT attached to the client-facing session
      // object. API routes read them server-side from the JWT via
      // getServerSession, so the raw tokens never touch the browser's JS
      // context — only the httpOnly cookie carries them.
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
