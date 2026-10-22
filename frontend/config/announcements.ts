export interface Announcement {
  id: string; // Unique deployment identifier, e.g. "deploy-2026-10-09-v1"
  badge: string; // e.g. "NEW RELEASE"
  title: string; // e.g. "Digital Card Themes & OTP Sign-In"
  description: string; // Brief summary of what's new
  date: string; // "Oct 9, 2026"
  features?: string[]; // Bullet points
  link?: string; // Optional documentation or release link
  expiresAt?: string; // ISO date string after which the announcement sunsets
}

/**
 * Whenever a new release is deployed to production:
 * 1. Change the `id` (e.g. "deploy-2026-10-15-v2")
 * 2. Update the title, description, and features.
 *
 * Every user will see the banner ONCE on their very first login/visit after the deployment.
 * Once dismissed (or viewed), it is marked as seen for their account and will never show again
 * until the next deployment with a new ID!
 */
export const CURRENT_ANNOUNCEMENT: Announcement | null = {
  id: "deploy-2026-10-22-v1-spends-analysis",
  badge: "NEW RELEASE",
  title: "Interactive Spends Analysis & Chart Intelligence",
  description: "Explore deep visual insights into your cash flows, category footprints, and daily spending velocity with our brand-new interactive Analysis hub.",
  date: "Oct 22, 2026",
  features: [
    "New Spends Analysis tab with interactive Area, Bar, and Donut charts",
    "Interactive category drilldown — click any slice or category to filter timeline spikes",
    "Weekly rhythm habit tracker to pinpoint peak spending days of the week",
    "Outflow source breakdown comparing Credit Card debt vs Liquid Bank debits",
    "Hardened session stability across multiple browser tabs and mobile sleep cycles",
  ],
  // Sunsets 14 days after release so users away for months don't see stale alerts
  expiresAt: "2026-11-05T23:59:59Z",
};
