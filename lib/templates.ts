// lib/templates.ts
// Default tap-to-fill templates per task type. Shipped as code, not a
// database row, so the free tier needs zero backend to render them.
import { TaskTemplate, TaskType } from "./db";

export const DEFAULT_TEMPLATES: Record<TaskType, TaskTemplate> = {
  pastoral: {
    id: "default-pastoral",
    taskType: "pastoral",
    templateName: "Pastoral log",
    isDefault: true,
    fields: [
      {
        key: "incidentType",
        label: "Type",
        options: ["Wellbeing check-in", "Conflict", "Refusal", "Safeguarding note", "Other"],
      },
      {
        key: "actionTaken",
        label: "Action taken",
        options: ["Verbal chat", "Time out", "Restorative conversation", "Referred up", "Logged only"],
      },
      {
        key: "followUp",
        label: "Follow-up needed",
        options: ["None", "Parent contact", "Check-in tomorrow", "Leader meeting"],
      },
    ],
  },
  inclusion: {
    id: "default-inclusion",
    taskType: "inclusion",
    templateName: "Inclusion note",
    isDefault: true,
    fields: [
      {
        key: "supportType",
        label: "Support type",
        options: ["Learning support", "EAL", "SEN referral", "Accommodation request", "Other"],
      },
      {
        key: "status",
        label: "Status",
        options: ["Monitoring", "In progress", "Needs review", "Resolved"],
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
  leadership: {
    id: "default-leadership",
    taskType: "leadership",
    templateName: "Reply to leadership",
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
  admin: {
    id: "default-admin",
    taskType: "admin",
    templateName: "Admin task",
    isDefault: true,
    fields: [
      {
        key: "adminType",
        label: "Type",
        options: ["Form / paperwork", "Data entry", "Facilities request", "Scheduling", "Other"],
      },
      {
        key: "status",
        label: "Status",
        options: ["Not started", "In progress", "Submitted", "Done"],
      },
    ],
  },
  planning: {
    id: "default-planning",
    taskType: "planning",
    templateName: "Planning note",
    isDefault: true,
    fields: [
      {
        key: "planningType",
        label: "Type",
        options: ["Lesson prep", "Unit planning", "Resource creation", "Curriculum review"],
      },
      {
        key: "priority",
        label: "Priority",
        options: ["Low", "Medium", "High"],
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
  ideas: {
    id: "default-ideas",
    taskType: "ideas",
    templateName: "Idea",
    isDefault: true,
    fields: [
      {
        key: "ideaArea",
        label: "Area",
        options: ["Teaching", "Curriculum", "Whole-school", "Personal"],
      },
      {
        key: "nextStep",
        label: "Next step",
        options: ["Note it", "Discuss with team", "Try next term"],
      },
    ],
  },
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  pastoral: "Pastoral",
  inclusion: "Inclusion",
  parent: "Parent",
  leadership: "Leadership",
  admin: "Office/Admin",
  planning: "Planning",
  assessment: "Assessment",
  ideas: "Ideas",
};

// Same colour per category everywhere a label shows up — the auto-detect
// feed's badges and, now, the sorted list's own editable category picker,
// so a "Pastoral" pill looks like the same thing in both places.
export const CATEGORY_STYLES: Record<TaskType, string> = {
  pastoral: "bg-rose-50 text-rose-700",
  inclusion: "bg-purple-50 text-purple-700",
  parent: "bg-sky-50 text-sky-700",
  leadership: "bg-amber-50 text-amber-700",
  admin: "bg-slate-100 text-slate-700",
  planning: "bg-indigo-50 text-indigo-700",
  assessment: "bg-teal-50 text-teal-700",
  ideas: "bg-lime-50 text-lime-700",
};
