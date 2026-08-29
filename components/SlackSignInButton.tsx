"use client";

// components/SlackSignInButton.tsx
//
// Slack's official "Add to Slack" button image, as published for embedding
// on third-party sites: https://api.slack.com/docs/slack-button. Hosted on
// Slack's own CDN (platform.slack-edge.com), so it always matches Slack's
// current branding rather than a screenshot we'd have to keep updated.
//
// This intentionally still calls next-auth's signIn("slack") underneath
// rather than linking straight to Slack's authorize URL — the existing
// OAuth redirect flow (with NextAuth's CSRF-protected state, the same
// flow that already works end to end on sort-ed.org) is unchanged; only
// the button's appearance changes here.

import { signIn } from "next-auth/react";

export default function SlackSignInButton() {
  return (
    <button
      onClick={() => signIn("slack")}
      className="inline-flex items-center rounded focus:outline-none focus:ring-2 focus:ring-sorted-primary/40"
      aria-label="Add to Slack"
    >
      <img
        alt="Add to Slack"
        height={40}
        width={139}
        src="https://platform.slack-edge.com/img/add_to_slack.png"
        srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
      />
    </button>
  );
}
