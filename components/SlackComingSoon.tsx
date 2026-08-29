// components/SlackComingSoon.tsx
//
// Stands in for SlackSignInButton wherever it used to appear (Adam: "Hide
// Slack for now or Add coming soon" — going with the latter, since it's
// the smaller, easily-reversible change: the actual Slack integration
// (SlackSignInButton.tsx, /api/slack/scan, the OAuth config in
// lib/auth.ts) is untouched and still fully working, just not offered as
// something to start yet — sort-ed.org's Slack app is still waiting on
// workspace-admin approval, so a real "Add to Slack" button right now
// would let someone click through into a flow that doesn't actually work
// yet. Swap this back for <SlackSignInButton /> once that's sorted.
export default function SlackComingSoon() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sorted-bg px-3 py-2 text-sm text-sorted-ink-soft">
      Slack
      <span className="rounded-full bg-sorted-primary-soft px-2 py-0.5 text-xs font-medium text-sorted-primary-dark">
        Coming soon
      </span>
    </span>
  );
}
