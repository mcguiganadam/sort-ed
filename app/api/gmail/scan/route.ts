// app/api/gmail/scan/route.ts
//
// Proxies a small, recent slice of Gmail to the browser so SortEd can
// suggest "this looks sortable." Nothing here is written to disk or a
// database: the access token is read from the encrypted session cookie for
// the length of this single request, used to call Gmail, and the response
// is streamed straight back to the browser. When this function returns,
// nothing about the request survives on the server.
//
// Only subject lines + senders + Gmail's own short snippet are fetched —
// never full message bodies. The "who/what" summary line built for the
// feed (lib/heuristics.ts summarize()) is local string formatting of that
// same snippet, not a separate summarisation call — this app reads school
// email, and nothing beyond what's needed to classify + display should
// leave this request, let alone reach a third-party model API.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  classifySnippet,
  cleanSenderName,
  initialsFrom,
  scoreUrgency,
  summarize,
  DetectedItem,
} from "@/lib/heuristics";
import { getValidGoogleAccessToken, withRefreshedCookie } from "@/lib/googleToken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json(
      { error: "Not connected to Google. Sign in and grant Gmail read access first." },
      { status: 401 }
    );
  }

  // Google access tokens expire roughly hourly — this transparently
  // refreshes using the stored refresh token (see lib/googleToken.ts for
  // why this can't just happen in the NextAuth jwt() callback) and hands
  // back an updated cookie for the response to carry, if a refresh happened.
  const tokenResult = await getValidGoogleAccessToken(req, token);
  if (!tokenResult.accessToken) {
    const message =
      tokenResult.error === "expired_no_refresh_token"
        ? "Your Google connection expired and can't refresh automatically — disconnect and reconnect Google to fix this for good."
        : tokenResult.error === "refresh_failed"
        ? "Couldn't refresh your Google connection — try disconnecting and reconnecting Google."
        : "Not connected to Google. Sign in and grant Gmail read access first.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const accessToken = tokenResult.accessToken;

  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=newer_than:2d in:inbox",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      // Surface Google's actual error message (e.g. "Invalid Credentials",
      // "Gmail API has not been used in project ... before or it is
      // disabled") instead of a bare status code — this is exactly the
      // kind of detail that made the original expired-token failure look
      // like an opaque, unexplained "Gmail API error".
      const detail = await listRes.json().catch(() => null);
      const message = detail?.error?.message
        ? `Gmail API error: ${detail.error.message}`
        : `Gmail API error (status ${listRes.status})`;
      return withRefreshedCookie(NextResponse.json({ error: message }, { status: 502 }), tokenResult);
    }
    const listJson = await listRes.json();
    const messageIds: string[] = (listJson.messages ?? []).map((m: any) => m.id);

    const items: DetectedItem[] = [];
    for (const id of messageIds) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const from = headers.find((h) => h.name === "From")?.value ?? "Unknown";
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      // Gmail's own short preview of the message body, already generated
      // by Google as part of the message resource we're fetching anyway.
      const rawSnippet: string = msg.snippet ?? "";
      const classifyText = `${subject} ${rawSnippet}`;

      const suggestedType = classifySnippet(classifyText, from);
      if (!suggestedType) continue; // only surface things that look sortable

      const timestamp = Number(msg.internalDate) || Date.now();

      items.push({
        ref: id,
        from: cleanSenderName(from),
        subject,
        snippet: summarize({ subject, body: rawSnippet }),
        raw: rawSnippet,
        suggestedType,
        suggestedInitials: initialsFrom(from),
        urgency: scoreUrgency(classifyText, from),
        timestamp,
        source: "gmail",
      });
    }

    return withRefreshedCookie(NextResponse.json({ items }), tokenResult);
  } catch (err) {
    return withRefreshedCookie(
      NextResponse.json({ error: "Unexpected error scanning Gmail." }, { status: 500 }),
      tokenResult
    );
  }
}
