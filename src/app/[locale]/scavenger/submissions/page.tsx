import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import SubmissionsPage from "@/components/submissions/SubmissionsPage";
import { Send } from "lucide-react";

export default async function SubmissionsRoute() {
  const session = await auth0.getSession();
  const user = session?.user;

  // Gated independently of SCAVENGER_HUNT_ENABLED so submissions can open on
  // submission day without also opening the hunt.
  const submissionsEnabled = process.env.SUBMISSIONS_ENABLED === "true";
  const isUserAdmin = user?.["cusec/roles"]?.includes("Admin") || false;
  const isUserVolunteer = user?.["cusec/roles"]?.includes("Volunteer") || false;

  // Make sure the Mongo user record exists before the client starts posting
  // submissions against it.
  if (user?.email) {
    await findOrCreateUser({
      email: user.email,
      name: user.name || "Delegate",
    });
  }

  const showPlatform =
    user && (submissionsEnabled || isUserAdmin || isUserVolunteer);

  return (
    // `.v2` scopes the main site's design tokens to this page — see
    // src/app/styles/v2/base.css. The rest of the scavenger island keeps the
    // grayscale Tailwind theme.
    <div className="v2">
      <link
        rel="preload"
        as="image"
        href="/assets/v2/background-unified.webp"
        type="image/webp"
        fetchPriority="high"
      />

      <main className="v2-scene v2-sub-scene">
        {/* The painting, as an <img> rather than a CSS background so it can be
            preloaded and priced properly by the browser. Same asset and
            object-fit treatment as the main site. */}
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

        {showPlatform ? (
          <SubmissionsPage userEmail={user.email ?? ""} />
        ) : (
          <section className="v2-section v2-sub">
            <div className="v2-container">
              <div className="v2-sub__gate">
                <h1 className="v2-sub__title">Submissions</h1>
                <p className="v2-sub__gate-body">
                  Submit your challenge videos for CUSEC 2027.
                </p>

                {/*
                  Not a Next.js page: proxy.ts hands `/auth/*` to Auth0's
                  middleware, so this needs a real document request. A
                  client-side <Link> would never reach the handler. Same
                  pattern as the /scavenger page.
                */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/auth/login?returnTo=/scavenger/submissions"
                  className="v2-btn v2-btn--primary"
                >
                  <Send className="h-4 w-4" />
                  {submissionsEnabled ? "Sign In to Submit" : "Beta Access Login"}
                </a>

                {!submissionsEnabled && (
                  <p className="v2-sub__gate-foot">
                    Submissions open on submission day.
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
