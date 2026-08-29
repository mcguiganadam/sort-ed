// lib/heuristics.ts
//
// Cheap, explainable, keyword-based "does this look like a sortable admin
// task" detector — plus local "who/what" summarising and urgency scoring
// for the auto-detect feed. Deliberately NOT an LLM call anywhere in this
// file: this app reads school email and Slack traffic (SEN/inclusion,
// pastoral, safeguarding-adjacent, parent communication), and none of that
// message content should have to leave the teacher's own session and hit a
// third-party model API just to get summarised or triaged. A transparent
// rule the teacher can see beats a black box for something touching
// student-adjacent communication.
//
// The "summary" shown in the auto-detect feed is built purely from data the
// scan routes already fetch for classification (Gmail's own snippet field,
// or the Slack message text) — reformatted and trimmed locally, never sent
// anywhere but back to the teacher's own browser tab.

import { TaskType } from "./db";

export type Urgency = "urgent" | "soon" | "normal";

export interface DetectedItem {
  ref: string; // gmail message id or slack ts
  from: string;
  subject?: string; // gmail only — used to build "Re:" reply drafts
  snippet: string; // local "who — what" summary line, ready to display
  raw: string; // the underlying snippet/message text, for the optional on-device AI pass (lib/localAI.ts) — never sent anywhere itself
  suggestedType: TaskType | null;
  suggestedInitials: string;
  urgency: Urgency;
  timestamp: number; // ms since epoch, for interleaving gmail + slack by recency
  source: "gmail" | "slack";
}

const LEADERSHIP_HINTS = ["progress update", "data by", "can you send", "eop", "senior leader", "middle leader", "slt", "please confirm"];
const PARENT_HINTS = ["my son", "my daughter", "my child", "parent", "guardian", "pickup", "concerned about", "could we meet"];
const INCLUSION_HINTS = ["sen ", "iep", "eal", "additional support", "accommodation", "individual education plan", "learning support"];
const PASTORAL_HINTS = ["incident", "behaviour", "behavior", "referral", "playground", "detention", "wellbeing", "safeguarding"];

function scoreHints(text: string, hints: string[]): number {
  const lower = text.toLowerCase();
  return hints.reduce((score, hint) => (lower.includes(hint) ? score + 1 : score), 0);
}

export function classifySnippet(subjectOrText: string, from: string): TaskType | null {
  const combined = `${subjectOrText} ${from}`;
  const scores: [TaskType, number][] = [
    ["parent", scoreHints(combined, PARENT_HINTS)],
    ["leadership", scoreHints(combined, LEADERSHIP_HINTS)],
    ["inclusion", scoreHints(combined, INCLUSION_HINTS)],
    ["pastoral", scoreHints(combined, PASTORAL_HINTS)],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = scores[0];
  return topScore > 0 ? topType : null;
}

// Traffic-light urgency, same "cheap keyword rule, no model" philosophy as
// classifySnippet above. Safeguarding/incident language is treated as
// urgent regardless of category, since that's the one place a teacher
// really can't afford this sitting unread in a merged feed.
const URGENT_HINTS = [
  "urgent",
  "asap",
  "as soon as possible",
  "immediately",
  "right away",
  "emergency",
  "safeguarding",
  "before end of day",
  "eod",
  "need this today",
  "this morning",
];
const SOON_HINTS = [
  "tomorrow",
  "this week",
  "by friday",
  "reminder",
  "follow up",
  "follow-up",
  "when you get a chance",
  "please confirm",
  "by end of week",
  "next few days",
];

export function scoreUrgency(text: string, from: string): Urgency {
  const combined = `${text} ${from}`.toLowerCase();
  if (URGENT_HINTS.some((hint) => combined.includes(hint))) return "urgent";
  if (SOON_HINTS.some((hint) => combined.includes(hint))) return "soon";
  return "normal";
}

// Strips Slack's mrkdwn syntax down to plain, readable text:
// <@U123> mentions, <#C123|name> channel links, <url|label> / <url> links,
// and *bold*/_italic_/`code` markers. Pure string cleanup, no network call.
export function cleanSlackText(text: string): string {
  return text
    .replace(/<@[^>]+>/g, "@someone")
    .replace(/<#[^|>]+\|([^>]+)>/g, "#$1")
    .replace(/<([^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<([^>]+)>/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Firstname Lastname <email>" -> "Firstname Lastname"
export function cleanSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<[^>]+>$/);
  return (match ? match[1] : from).trim();
}

// Feed lines are meant to be scanned in a glance, not read — 180 characters
// (the old cap) is roughly two full sentences and was itself part of why the
// feed felt noisy ("summaries don't summarise that much"), independent of
// whatever CSS truncation is or isn't doing. Cut well before that, and cut
// on a word boundary rather than mid-word, so short is also tidy.
const MAX_SUMMARY_CHARS = 90;

function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

// Builds the short "what this is" line shown next to the sender's name in
// the feed, from whatever was already fetched for classification — Gmail's
// own auto-generated snippet, or the Slack message text. No additional
// summarisation call (local or remote) is made.
export function summarize(params: { subject?: string; body: string }): string {
  const { subject, body } = params;
  const cleanedBody = body.replace(/\s+/g, " ").trim();
  const cleanedSubject = subject?.replace(/\s+/g, " ").trim();
  const combined =
    cleanedSubject &&
    cleanedBody &&
    !cleanedBody.toLowerCase().startsWith(cleanedSubject.toLowerCase().slice(0, 12))
      ? `${cleanedSubject} — ${cleanedBody}`
      : cleanedBody || cleanedSubject || "";
  return truncateAtWord(combined, MAX_SUMMARY_CHARS);
}

export function initialsFrom(nameOrEmail: string): string {
  const namePart = nameOrEmail.split("<")[0].trim();
  const parts = namePart.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[1][0]}.`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return `${parts[0][0]}.`.toUpperCase();
  }
  return "?.";
}
