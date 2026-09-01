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

  const showDashboard =
    user && (scavengerEnabled || isUserAdmin || isUserVolunteer);

  return (
    // `.v2` scopes the main site's design tokens to this page — see
    // src/app/styles/v2/base.css. The Tailwind theme the scavenger components
    // themselves use is remapped onto the same palette in globals.css.
    <div className="v2">
      <link
        rel="preload"
        as="image"
        href="/assets/v2/background-unified.webp"
        type="image/webp"
        fetchPriority="high"
      />

      <main className="v2-scene v2-hunt-scene text-light-mode">
        {/* The painting, as an <img> rather than a CSS background so it can be
            preloaded. Same asset and object-fit treatment as the main site. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="v2-scene__backdrop"
          src="/assets/v2/background-unified.webp"
          alt=""
          width={2560}
          height={12360}
          fetchPriority="high"
          aria-hidden="true"
        />

        {showDashboard ? (
          <Dashboard
            user={user as Auth0User}
            dbUser={dbUser}
            baseURL={process.env.APP_BASE_URL || ""}
            emailVerified={emailVerified}
          />
        ) : (
          <section className="v2-section v2-hunt-gate">
            <div className="v2-container">
              <div className="v2-sub__gate">
                <h1 className="v2-sub__title">Scavenger Hunt</h1>
                <p className="v2-sub__gate-body">
                  Scan codes, solve puzzles, and climb the leaderboard at CUSEC
                  2027.
                </p>

                {/*
                  Not a Next.js page: proxy.ts hands `/auth/*` to Auth0's
                  middleware, so this needs a real document request. A
                  client-side <Link> would never reach the handler.
                */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/auth/login?returnTo=/scavenger"
                  className="v2-btn v2-btn--primary"
                >
                  <Trophy className="h-4 w-4" />
                  {scavengerEnabled ? "Start Hunting" : "Beta Access Login"}
                </a>

                {!scavengerEnabled && (
                  <p className="v2-sub__gate-foot">
                    The hunt opens closer to the conference.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
