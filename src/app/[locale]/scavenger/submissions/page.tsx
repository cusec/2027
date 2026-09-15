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

  return showPlatform ? (
    <SubmissionsPage userEmail={user.email ?? ""} />
  ) : (
    <section className="aero-page">
      <div className="v2-card v2-glass aero-gate">
        <h1 className="aero-title">Submissions</h1>
        <p>Submit your challenge videos for CUSEC 2027.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/auth/login?returnTo=/scavenger/submissions"
          className="aero-btn"
        >
          <Send className="h-4 w-4" />
          {submissionsEnabled ? "Sign in to submit" : "Beta access login"}
        </a>
        {!submissionsEnabled && (
          <p className="aero-gate__foot">
            Submissions open on submission day.
          </p>
        )}
      </div>
    </section>
  );
}
