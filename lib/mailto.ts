// lib/mailto.ts
//
// "Read by the app to draft replies" is implemented as a mailto: link, not
// as SortEd sending mail on the teacher's behalf. The context used to
// build the draft (sender, subject/snippet) lives only in React state for
// the life of the auto-detect scan — it is never written to IndexedDB or
// any server. Clicking the link hands off to the teacher's own mail client
// (which opens Gmail compose, pre-filled) — the teacher reviews and hits
// send themselves. This keeps SortEd's Gmail OAuth grant read-only.

import { TaskType } from "./db";

const OPENERS: Record<TaskType, string> = {
  parent: "Thanks so much for reaching out about this — here's an update:",
  leadership: "Thanks for the ping — here's where this stands:",
  pastoral: "Following up on this — here's what happened and what I've done:",
  inclusion: "Following up on this — here's where things stand:",
  admin: "Following up on this:",
  planning: "Here's where this is at:",
  ideas: "Following up on this:",
  assessment: "Sharing the update on this:",
};

export function buildMailtoDraft(params: {
  toEmail?: string;
  subject: string;
  suggestedType: TaskType | null;
  senderName: string;
}): string {
  const { toEmail, subject, suggestedType, senderName } = params;
  const opener = suggestedType ? OPENERS[suggestedType] : "Following up on this:";
  const body = [`Hi ${senderName.split("<")[0].trim() || "there"},`, "", opener, "", "", "Best,"].join("\n");
  const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;

  const params2 = new URLSearchParams({ subject: replySubject, body });
  const to = toEmail ? encodeURIComponent(toEmail) : "";
  return `mailto:${to}?${params2.toString()}`;
}
