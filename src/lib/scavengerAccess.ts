import { auth0 } from "@/lib/auth0";

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
