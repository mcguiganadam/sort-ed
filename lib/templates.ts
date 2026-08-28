// lib/templates.ts
// Default tap-to-fill templates per task type. Shipped as code, not a
// database row, so the free tier needs zero backend to render them.
import { TaskTemplate, TaskType } from "./db";

export const DEFAULT_TEMPLATES: Record<TaskType, TaskTemplate> = {
  behaviour: {
    id: "default-behaviour",
    taskType: "behaviour",
    templateName: "Behaviour log",
    isDefault: true,
    fields: [
      {
        key: "incidentType",
        label: "Incident type",
        options: ["Conflict", "Refusal", "Language", "Property", "Other"],
      },
      {
        key: "actionTaken",
        label: "Action taken",
        options: ["Verbal warning", "Time out", "Restorative chat", "Referred up", "Logged only"],
      },
      {
        key: "followUp",
        label: "Follow-up needed",
        options: ["None", "Parent contact", "Check-in tomorrow", "Leader meeting"],
      },
    ],
  },
  assessment: {
    id: "default-assessment",
    taskType: "assessment",
    templateName: "Assessment entry",
    isDefault: true,
    fields: [
      { key: "subject", label: "Subject" },
      { key: "score", label: "Score / level" },
      {
        key: "flag",
        label: "Flag",
        options: ["On track", "Watch", "Needs support", "Exceeding"],
      },
    ],
  },
  parent: {
    id: "default-parent",
    taskType: "parent",
    templateName: "Parent communication",
    isDefault: true,
    fields: [
      {
        key: "scenario",
        label: "Scenario",
        options: ["Progress update", "Behaviour follow-up", "Meeting request", "General check-in"],
      },
      {
        key: "tone",
        label: "Tone",
        options: ["Positive", "Neutral / informational", "Concerned"],
      },
    ],
  },
  leader: {
    id: "default-leader",
    taskType: "leader",
    templateName: "Reply to leader",
    isDefault: true,
    fields: [
      {
        key: "requestType",
        label: "What they need",
        options: ["Progress update", "Data request", "Confirmation", "Meeting availability"],
      },
      {
        key: "status",
        label: "Status",
        options: ["Done, sharing now", "In progress", "Need more time", "Question back to them"],
      },
    ],
  },
  meeting: {
    id: "default-meeting",
    taskType: "meeting",
    templateName: "Meeting prep",
    isDefault: true,
    fields: [
      { key: "withWhom", label: "With whom" },
      {
        key: "prepNeeded",
        label: "Prep needed",
        options: ["Bring data", "Bring examples of work", "Review previous notes", "None — just show up"],
      },
    ],
  },
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  behaviour: "Behaviour",
  assessment: "Assessment",
  parent: "Parent",
  leader: "Leader reply",
  meeting: "Meeting prep",
};
