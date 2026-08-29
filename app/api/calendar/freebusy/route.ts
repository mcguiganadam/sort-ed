// app/api/calendar/freebusy/route.ts
//
// Reads the teacher's Google Calendar free/busy for the next 5 school days
// so the batch-window suggestion is based on their real schedule instead of
// a guess. Read-only, calendar.readonly scope — SortEd can see when slots
// are free/busy, never event titles, attendees, or descriptions, and
// nothing about the calendar is written anywhere server-side.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getValidGoogleAccessToken, withRefreshedCookie } from "@/lib/googleToken";

export const dynamic = "force-dynamic";

function nextWeekdayWindow(days: number) {
  const now = new Date();
  const end = new Date(now);
  let added = 0;
  while (added < days) {
    end.setDate(end.getDate() + 1);
    const day = end.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return { timeMin: now.toISOString(), timeMax: end.toISOString() };
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json(
      { error: "Not connected to Google. Sign in and grant Calendar read access first." },
      { status: 401 }
    );
  }

  // See lib/googleToken.ts — access tokens expire roughly hourly and this
  // route (like gmail/scan) reads the cookie directly via getToken(), which
  // never runs NextAuth's own jwt() callback, so refreshing has to happen
  // here rather than relying on lib/auth.ts.
  const tokenResult = await getValidGoogleAccessToken(req, token);
  if (!tokenResult.accessToken) {
    const message =
      tokenResult.error === "expired_no_refresh_token"
        ? "Your Google connection expired and can't refresh automatically — disconnect and reconnect Google to fix this for good."
        : tokenResult.error === "refresh_failed"
        ? "Couldn't refresh your Google connection — try disconnecting and reconnecting Google."
        : "Not connected to Google. Sign in and grant Calendar read access first.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const accessToken = tokenResult.accessToken;

  const { timeMin, timeMax } = nextWeekdayWindow(5);

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      const message = detail?.error?.message
        ? `Calendar API error: ${detail.error.message}`
        : `Calendar API error (status ${res.status})`;
      return withRefreshedCookie(NextResponse.json({ error: message }, { status: 502 }), tokenResult);
    }
    const json = await res.json();
    const busy = json.calendars?.primary?.busy ?? [];
    return withRefreshedCookie(NextResponse.json({ timeMin, timeMax, busy }), tokenResult);
  } catch (err) {
    return withRefreshedCookie(
      NextResponse.json({ error: "Unexpected error reading calendar." }, { status: 500 }),
      tokenResult
    );
  }
}
