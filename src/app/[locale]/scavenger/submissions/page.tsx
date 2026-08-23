import type React from "react";
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
    <main
      className="relative min-h-screen text-light-mode overflow-x-hidden"
      style={
        {
          backgroundImage: "url('/assets/linking-screen-1.png')",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
          backgroundPosition: "center",
          "--color-light-mode": "#111827",
        } as React.CSSProperties
      }
    >
      {showPlatform ? (
        <SubmissionsPage userEmail={user.email ?? ""} />
      ) : (
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-wide">SUBMISSIONS</h1>
          <p className="mt-4 text-light-mode/80">
            Submit your challenge videos for CUSEC 2027.
          </p>
          {/*
            Not a Next.js page: proxy.ts hands `/auth/*` to Auth0's middleware,
            so this needs a real document request. A client-side <Link> would
            never reach the handler. Same pattern as the /scavenger page.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/auth/login?returnTo=/scavenger/submissions"
            className="register-hover mt-8 inline-flex items-center gap-2 rounded-full border-2 border-light-mode/40 px-6 py-3 font-semibold"
          >
            <Send className="h-5 w-5" />
            {submissionsEnabled ? "Sign In to Submit" : "Beta Access Login"}
          </a>
          {!submissionsEnabled && (
            <p className="mt-6 text-sm text-light-mode/70">
              Submissions open on submission day.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
