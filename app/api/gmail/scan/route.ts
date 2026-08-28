// app/api/gmail/scan/route.ts
//
// Proxies a small, recent slice of Gmail to the browser so SortEd can
// suggest "this looks parkable." Nothing here is written to disk or a
// database: the access token is read from the encrypted session cookie for
// the length of this single request, used to call Gmail, and the response
// is streamed straight back to the browser. When this function returns,
// nothing about the request survives on the server.
//
// Only subject lines + senders + a short snippet are fetched — never full
// message bodies — which is also why the heuristic classifier in
// lib/heuristics.ts works off snippets rather than full text.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { classifySnippet, initialsFrom, DetectedItem } from "@/lib/heuristics";

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
      const snippet: string = msg.snippet ?? "";

      const suggestedType = classifySnippet(`${subject} ${snippet}`, from);
      if (!suggestedType) continue; // only surface things that look parkable

      items.push({
        ref: id,
        from,
        snippet: subject,
        suggestedType,
        suggestedInitials: initialsFrom(from),
      });
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error scanning Gmail." }, { status: 500 });
  }
}
