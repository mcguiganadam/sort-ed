// app/api/calendar/freebusy/route.ts
//
// Reads the teacher's Google Calendar free/busy for the next 5 school days
// so the batch-window suggestion is based on their real schedule instead of
// a guess. Read-only, calendar.readonly scope — SortEd can see when slots
// are free/busy, never event titles, attendees, or descriptions, and
// nothing about the calendar is written anywhere server-side.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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
  const accessToken = token?.googleAccessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Google. Sign in and grant Calendar read access first." },
      { status: 401 }
    );
  }

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
      return NextResponse.json({ error: "Calendar API error", status: res.status }, { status: 502 });
    }
    const json = await res.json();
    const busy = json.calendars?.primary?.busy ?? [];
    return NextResponse.json({ timeMin, timeMax, busy });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error reading calendar." }, { status: 500 });
  }
}
