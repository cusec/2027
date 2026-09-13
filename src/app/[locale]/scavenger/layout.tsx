import { getScavengerAccess } from "@/lib/scavengerAccess";
import ScavengerPreview from "@/components/scavenger/ScavengerPreview";
import { findOrCreateUser } from "@/lib/userService";
import AeroDock from "@/components/scavenger/AeroDock";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2Footer from "@/app/components/v2/Footer/V2Footer";
import type { Auth0User, DbUser } from "@/lib/interface";
import { getBaseUrl } from "@/lib/siteUrl";

export default async function ScavengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, anyOpen } = await getScavengerAccess();

  let dbUser: DbUser | null = null;
  if (anyOpen && user?.email) {
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

      {/* While the hunt is closed, /scavenger is a page of the public site,
          reached from its navbar, so it carries the site nav and footer the
          way /speakers does. Once open, the dock is the navigation instead. */}
      {!anyOpen && (
        <>
          <V2Nav />
          <V2Scrollbar />
        </>
      )}

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
            baseURL={await getBaseUrl()}
          />
        )}

        {/* One gate for /scavenger and every page under it: a gate that only
            covers some of them is not a gate. While the hunt and submissions
            are both closed, everyone who is not staff gets the preview, signed
            in or not, with no dock to reach the pages behind it. */}
        {anyOpen ? (
          <div className={dbUser ? "aero-stage" : undefined}>{children}</div>
        ) : (
          <ScavengerPreview signedIn={Boolean(user)} />
        )}
      </div>

      {!anyOpen && <V2Footer />}
    </div>
  );
}
