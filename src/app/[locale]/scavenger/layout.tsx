import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import AeroDock from "@/components/scavenger/AeroDock";
import type { Auth0User, DbUser } from "@/lib/interface";

export default async function ScavengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const user = session?.user;

  let dbUser: DbUser | null = null;
  if (user?.email) {
    const mongoUser = await findOrCreateUser({
      email: user.email,
      name: user.name || "Hunter",
    });
    if (mongoUser) {
      const plain = mongoUser.toObject();
      dbUser = JSON.parse(
        JSON.stringify({ ...plain, points: plain.points || 0 })
      );
    }
  }

  return (
    <div className="v2 v2-aero">
      <link
        rel="preload"
        as="image"
        href="/assets/v2/background-unified.webp"
        type="image/webp"
        fetchPriority="high"
      />

      <div className="v2-scene aero-scene">
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

        {dbUser && (
          <AeroDock
            user={user as Auth0User}
            dbUser={dbUser}
            linkedEmail={dbUser.linked_email}
            baseURL={process.env.APP_BASE_URL || ""}
          />
        )}

        <div className={dbUser ? "aero-stage" : undefined}>{children}</div>
      </div>
    </div>
  );
}
