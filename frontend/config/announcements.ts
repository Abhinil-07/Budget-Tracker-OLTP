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
  id: "deploy-2026-10-09-v2-polish-otp",
  badge: "DEPLOYED TO PROD",
  title: "Cinematic Login, Card Refinements & Gesture Swiping",
  description: "Experience our new cinematic animated login with daily motivational affirmations, seamless borderless digital cards with camouflaged live badges, and streamlined mobile card swiping.",
  date: "Oct 9, 2026",
  features: [
    "Cinematic 4s animated login screen with inspiring daily quotes & aurora lighting",
    "Seamless borderless card design with translucent gradient-camouflaged live pills",
    "Pure touch swiping on mobile transaction carousel (arrow buttons hidden on mobile)",
    "Passwordless 6-digit OTP sign-in & one-time mobile number profile linking",
  ],
  // Sunsets 14 days after release so users away for months don't see stale alerts
  expiresAt: "2026-10-23T23:59:59Z",
};
