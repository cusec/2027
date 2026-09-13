import { auth0 } from "@/lib/auth0";

/**
 * Who can reach the signed-in scavenger app right now.
 *
 * The hunt and challenge submissions open on flags of their own, so each can
 * launch on its own day. Admins and volunteers always get through, which is
 * how both are rehearsed against production before they open.
 *
 * Server-only: it reads the session. The one place these flags and the staff
 * bypass are read for pages, so the layout gate and the pages under it can
 * never disagree about what "open" means.
 */
export async function getScavengerAccess() {
  const session = await auth0.getSession();
  const user = session?.user ?? null;
  const roles = (user?.["cusec/roles"] as string[] | undefined) ?? [];
  const isStaff = roles.includes("Admin") || roles.includes("Volunteer");

  const huntOpen = process.env.SCAVENGER_HUNT_ENABLED === "true" || isStaff;
  const submissionsOpen =
    process.env.SUBMISSIONS_ENABLED === "true" || isStaff;

  return {
    user,
    isStaff,
    huntOpen,
    submissionsOpen,
    anyOpen: huntOpen || submissionsOpen,
  };
}
