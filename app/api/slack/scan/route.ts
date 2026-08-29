// app/api/slack/scan/route.ts
//
// Same idea as the Gmail scan: read a little, flag what looks sortable,
// return it, forget it. Uses the teacher's own Slack USER token (not a bot
// token) so it only ever sees what that teacher can already see, and only
// requests read-history scopes — SortEd cannot post, edit, or delete
// anything in Slack.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  classifySnippet,
  cleanSlackText,
  initialsFrom,
  scoreUrgency,
  summarize,
  DetectedItem,
} from "@/lib/heuristics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const slackToken = token?.slackUserToken as string | undefined;

  if (!slackToken) {
    return NextResponse.json(
      { error: "Not connected to Slack. Sign in and grant Slack read access first." },
      { status: 401 }
    );
  }

  try {
    const channelsRes = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im&limit=20",
      { headers: { Authorization: `Bearer ${slackToken}` } }
    );
    const channelsJson = await channelsRes.json();
    if (!channelsJson.ok) {
      // Slack's error payload for scope problems includes `needed` (the
      // scope that was missing) and `provided` (what the token actually
      // has) — surfacing those makes a missing_scope error actionable
      // instead of just a name, both for us during setup and for anyone
      // who has to debug this again later.
      const detail = channelsJson.needed
        ? ` (needed: ${channelsJson.needed}; provided: ${channelsJson.provided ?? "none"})`
        : "";
      return NextResponse.json(
        { error: `Slack API error: ${channelsJson.error}${detail}` },
        { status: 502 }
      );
    }

    const oneDayAgo = (Date.now() / 1000 - 60 * 60 * 24).toFixed(6);
    const items: DetectedItem[] = [];

    for (const channel of (channelsJson.channels ?? []).slice(0, 8)) {
      const histRes = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oneDayAgo}&limit=10`,
        { headers: { Authorization: `Bearer ${slackToken}` } }
      );
      const histJson = await histRes.json();
      if (!histJson.ok) continue;

      for (const msg of histJson.messages ?? []) {
        const rawText: string = msg.text ?? "";
        const cleanedText = cleanSlackText(rawText);
        const from = channel.name ? `#${channel.name}` : "DM";

        const suggestedType = classifySnippet(cleanedText, from);
        if (!suggestedType) continue;

        const timestamp = Math.round(parseFloat(msg.ts) * 1000) || Date.now();

        items.push({
          ref: msg.ts,
          from,
          snippet: summarize({ body: cleanedText }),
          suggestedType,
          suggestedInitials: initialsFrom(from),
          urgency: scoreUrgency(cleanedText, from),
          timestamp,
          source: "slack",
        });
      }
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error scanning Slack." }, { status: 500 });
  }
}
