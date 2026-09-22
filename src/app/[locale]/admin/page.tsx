import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { hasVerifiedCusecEmail } from "@/lib/staffAccess";
import { getPathname, Link } from "@/i18n/navigation";
import V2Scene from "@/app/components/v2/Scene/V2Scene";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("V2.adminDashboard");
  const session = await auth0.getSession();
  const user = session?.user;
  const roles = user?.["cusec/roles"] ?? [];
  const admin = roles.includes("Admin");
  const volunteer = roles.includes("Volunteer");
  if (user && !admin && !volunteer && !hasVerifiedCusecEmail(user)) notFound();

  return (
    <main className="v2 v2-admin">
      <V2Scene>
        <div className="v2-admin__wrap">
          <Link className="v2-meet__brand v2-pixel" href="/">CUSEC <span>2027</span></Link>
          <div className="v2-glass v2-admin__panel">
            <p className="v2-meet__eyebrow">{t("eyebrow")}</p>
            <h1 className="v2-pixel v2-admin__title">{t("title")}</h1>
            {!user ? (
              <>
                <p className="v2-admin__intro">{t("sign-in-body")}</p>
                <a className="v2-btn v2-btn--primary" href={`/auth/login?returnTo=${encodeURIComponent(getPathname({ locale, href: "/admin" }))}`}>{t("sign-in")}</a>
              </>
            ) : (
              <>
                <p className="v2-admin__intro">{t("intro")}</p>
                <div className="v2-admin__grid">
                  {(admin || hasVerifiedCusecEmail(user)) && (
                    <Link className="v2-admin__tool" href="/admin/event-links">
                      <h2>{t("links-title")}</h2><p>{t("links-body")}</p><span>{t("open")}</span>
                    </Link>
                  )}
                  {admin && (
                    <form action="/api/admin/event-signups" method="get" className="v2-admin__tool">
                      <h2>{t("export-title")}</h2><p>{t("export-body")}</p>
                      <button className="v2-admin__tool-action" type="submit">{t("download")}</button>
                    </form>
                  )}
                  {(admin || volunteer) && (
                    <Link className="v2-admin__tool" href="/scavenger">
                      <h2>{t("hunt-title")}</h2><p>{t("hunt-body")}</p><span>{t("open")}</span>
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </V2Scene>
    </main>
  );
}
