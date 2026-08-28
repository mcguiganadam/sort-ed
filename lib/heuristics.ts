// lib/heuristics.ts
//
// Cheap, explainable, keyword-based "does this look like a parkable admin
// task" detector. Deliberately NOT an LLM call: no message content should
// have to leave the teacher's session and hit a third-party model API to
// get flagged, and a transparent rule the teacher can see beats a black box
// for something touching student-adjacent communication.
//
// Every function here takes only a subject/snippet + sender, never the
// full message body — that's all the /api/gmail/scan and /api/slack/scan
// routes fetch in the first place.

import { TaskType } from "./db";

export interface DetectedItem {
  ref: string; // gmail message id or slack ts
  from: string;
  snippet: string;
  suggestedType: TaskType | null;
  suggestedInitials: string;
}

const LEADER_HINTS = ["progress update", "data by", "can you send", "eop", "senior leader", "middle leader", "slt", "please confirm"];
const PARENT_HINTS = ["my son", "my daughter", "my child", "parent", "guardian", "pickup", "concerned about", "could we meet"];
const MEETING_HINTS = ["meeting", "calendar invite", "schedule a", "catch up", "let's find a time", "quick chat"];
const BEHAVIOUR_HINTS = ["incident", "behaviour", "behavior", "referral", "playground", "detention"];

function scoreHints(text: string, hints: string[]): number {
  const lower = text.toLowerCase();
  return hints.reduce((score, hint) => (lower.includes(hint) ? score + 1 : score), 0);
}

export function classifySnippet(subjectOrText: string, from: string): TaskType | null {
  const combined = `${subjectOrText} ${from}`;
  const scores: [TaskType, number][] = [
    ["parent", scoreHints(combined, PARENT_HINTS)],
    ["leader", scoreHints(combined, LEADER_HINTS)],
    ["meeting", scoreHints(combined, MEETING_HINTS)],
    ["behaviour", scoreHints(combined, BEHAVIOUR_HINTS)],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = scores[0];
  return topScore > 0 ? topType : null;
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
