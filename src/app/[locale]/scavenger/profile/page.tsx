import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import { RegisteredUser } from "@/lib/models";
import ProfileCard from "@/components/scavenger/profile/ProfileCard";
import type { Auth0User } from "@/lib/interface";
import { UserRound } from "lucide-react";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user?.email) {
    return (
      <section className="aero-page">
        <div className="aero-panel aero-gate">
          <h1 className="aero-title">Your profile</h1>
          <p>Sign in to see your hunt profile.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/auth/login?returnTo=/scavenger/profile" className="aero-btn">
            <UserRound className="h-4 w-4" />
            Sign in
          </a>
        </div>
      </section>
    );
  }

  const mongoUser = await findOrCreateUser({
    email: user.email,
    name: user.name || "Hunter",
  });
  const plain = mongoUser?.toObject();
  const dbUser = JSON.parse(
    JSON.stringify({ ...plain, points: plain?.points || 0 })
  );

  let emailVerified = false;
  if (plain?.linked_email) {
    emailVerified = !!(await RegisteredUser.findOne({
      linkedEmail: plain.linked_email,
      isLinked: true,
    }).lean());
  }

  return (
    <section className="aero-page">
      <ProfileCard
        user={user as Auth0User}
        dbUser={dbUser}
        emailVerified={emailVerified}
      />
    </section>
  );
}
