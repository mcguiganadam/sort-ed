// app/api/slack/scan/route.ts
//
// Same idea as the Gmail scan: read a little, flag what looks sortable,
// return it, forget it. Uses the teacher's own Slack USER token (not a bot
// token) so it only ever sees what that teacher can already see, and only
// requests read-history scopes — SortEd cannot post, edit, or delete
// anything in Slack.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { classifySnippet, initialsFrom, DetectedItem } from "@/lib/heuristics";

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
      return NextResponse.json({ error: `Slack API error: ${channelsJson.error}` }, { status: 502 });
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
        const text: string = msg.text ?? "";
        const from = channel.name ? `#${channel.name}` : "DM";
        const suggestedType = classifySnippet(text, from);
        if (!suggestedType) continue;

        items.push({
          ref: msg.ts,
          from,
          snippet: text.slice(0, 140),
          suggestedType,
          suggestedInitials: initialsFrom(from),
        });
      }
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error scanning Slack." }, { status: 500 });
  }
}
