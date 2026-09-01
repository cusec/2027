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
      if (plainUser.linked_email) {
        const registeredUser = await RegisteredUser.findOne({
          linkedEmail: plainUser.linked_email,
          isLinked: true,
        }).lean();
        emailVerified = !!registeredUser;
      }
    }
  }

  const showDashboard =
    user && (scavengerEnabled || isUserAdmin || isUserVolunteer);

  if (!showDashboard) {
    return (
      <section className="aero-page">
        <div className="aero-panel aero-gate">
          <h1 className="aero-title">Scavenger Hunt</h1>
          <p>
            Scan codes, solve puzzles, and climb the leaderboard at CUSEC 2027.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/auth/login?returnTo=/scavenger" className="aero-btn">
            <Trophy className="h-4 w-4" />
            {scavengerEnabled ? "Start hunting" : "Beta access login"}
          </a>
          {!scavengerEnabled && (
            <p className="aero-gate__foot">
              The hunt opens closer to the conference.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <Dashboard
      user={user as Auth0User}
      dbUser={dbUser}
      baseURL={process.env.APP_BASE_URL || ""}
      emailVerified={emailVerified}
    />
  );
}
