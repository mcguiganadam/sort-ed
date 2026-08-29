// app/api/calendar/agenda/route.ts
//
// Reads today's Google Calendar events (start/end + title only) so the
// dashboard can show "Today's schedule" as a plain agenda. This is a
// deliberate widening of what SortEd reads from Calendar: the older
// freebusy route (still used nowhere now that BatchSuggestion has been
// replaced on the dashboard by components/TodaySchedule.tsx, but left in
// place unused per this codebase's convention) was built to see only
// free/busy blocks, specifically never event titles. Showing an actual
// agenda needs the titles, so this route does read them — still nothing
// but title + start/end, never description/attendees/location, and still
// nothing about the calendar is stored anywhere server-side; it's read on
// request and handed straight back to the browser.
//
// timeMin/timeMax are supplied by the client (computed from the browser's
// own local midnight-to-midnight), not guessed here, so "today" always
// means the teacher's actual today rather than the server's.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getValidGoogleAccessToken, withRefreshedCookie } from "@/lib/googleToken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json(
      { error: "Not connected to Google. Sign in and grant Calendar read access first." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin/timeMax." }, { status: 400 });
  }

  // See lib/googleToken.ts — access tokens expire roughly hourly and this
  // route (like gmail/scan and calendar/freebusy) reads the cookie directly
  // via getToken(), which never runs NextAuth's own jwt() callback, so
  // refreshing has to happen here rather than relying on lib/auth.ts.
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

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  // Titles only — no description/attendees/location come back from a
  // fields-restricted request, so there's nothing extra to accidentally
  // expose even though this route now reads titles.
  url.searchParams.set("fields", "items(summary,start,end)");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      const message = detail?.error?.message
        ? `Calendar API error: ${detail.error.message}`
        : `Calendar API error (status ${res.status})`;
      return withRefreshedCookie(NextResponse.json({ error: message }, { status: 502 }), tokenResult);
    }
    const json = await res.json();
    const events = (json.items ?? []).map((e: any) => ({
      title: e.summary ?? "(untitled)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      allDay: Boolean(e.start?.date && !e.start?.dateTime),
    }));
    return withRefreshedCookie(NextResponse.json({ events }), tokenResult);
  } catch {
    return withRefreshedCookie(
      NextResponse.json({ error: "Unexpected error reading calendar." }, { status: 500 }),
      tokenResult
    );
  }
}
