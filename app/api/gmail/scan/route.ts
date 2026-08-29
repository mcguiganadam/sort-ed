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

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.googleAccessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Google. Sign in and grant Gmail read access first." },
      { status: 401 }
    );
  }

  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=newer_than:2d in:inbox",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      return NextResponse.json({ error: "Gmail API error", status: listRes.status }, { status: 502 });
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

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error scanning Gmail." }, { status: 500 });
  }
}
