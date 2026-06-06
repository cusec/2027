import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import { RegisteredUser } from "@/lib/models";
import Dashboard from "@/components/scavenger/Dashboard";
import type { Auth0User } from "@/lib/interface";
import { Trophy } from "lucide-react";

export default async function ScavengerPage() {
  const session = await auth0.getSession();
  const user = session?.user;
  const scavengerEnabled = process.env.SCAVENGER_HUNT_ENABLED === "true";
  const isUserAdmin = user?.["cusec/roles"]?.includes("Admin") || false;
  const isUserVolunteer = user?.["cusec/roles"]?.includes("Volunteer") || false;

  // Find or create the MongoDB user record once the visitor is authenticated.
  let dbUser = null;
  let emailVerified = false;
  if (user?.email) {
    const mongoUser = await findOrCreateUser({
      email: user.email,
      name: user.name || "Hunter",
    });
    if (mongoUser) {
      const plainUser = mongoUser.toObject();
      dbUser = JSON.parse(
        JSON.stringify({ ...plainUser, points: plainUser.points || 0 })
      );
      // Confirm the linked email is genuinely registered and marked as linked
      if (plainUser.linked_email) {
        const registeredUser = await RegisteredUser.findOne({
          linkedEmail: plainUser.linked_email,
          isLinked: true,
        }).lean();
        emailVerified = !!registeredUser;
      }
    }
  }

  const showDashboard = user && (scavengerEnabled || isUserAdmin || isUserVolunteer);

  return (
    <main className="min-h-screen bg-dark-mode text-light-mode">
      {showDashboard ? (
        <Dashboard
          user={user as Auth0User}
          dbUser={dbUser}
          baseURL={process.env.APP_BASE_URL || ""}
          emailVerified={emailVerified}
        />
      ) : (
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-wide">SCAVENGER HUNT</h1>
          <p className="mt-4 text-light-mode/80">
            Scan codes, solve puzzles, and climb the leaderboard at CUSEC 2027.
          </p>
          <a
            href="/auth/login?returnTo=/scavenger"
            className="register-hover mt-8 inline-flex items-center gap-2 rounded-full border-2 border-light-mode/40 px-6 py-3 font-semibold"
          >
            <Trophy className="h-5 w-5" />
            {scavengerEnabled ? "Start Hunting" : "Beta Access Login"}
          </a>
          {!scavengerEnabled && (
            <p className="mt-6 text-sm text-light-mode/70">
              The hunt opens closer to the conference.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
