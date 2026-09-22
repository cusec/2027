import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { eventIdFrom } from "@/lib/eventLinks";
import { SITE_URL } from "@/lib/seo";
import { hasVerifiedCusecEmail } from "@/lib/staffAccess";
import { getPathname, Link } from "@/i18n/navigation";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import CopyEventLink from "./CopyEventLink";

export const metadata: Metadata = {
  title: "Event links",
  robots: { index: false, follow: false },
};

export default async function EventLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ name?: string; date?: string }>;
}) {
  const { locale } = await params;
  const { name, date } = await searchParams;
  const t = await getTranslations("V2.eventLinks");
  const session = await auth0.getSession();
  const path = getPathname({ locale, href: "/admin/event-links" });

  const admin = session?.user?.["cusec/roles"]?.includes("Admin") ?? false;
  if (session?.user && !admin && !hasVerifiedCusecEmail(session.user)) notFound();

  const eventName = typeof name === "string" ? name.trim().slice(0, 100) : "";
  const eventDate = typeof date === "string" ? date : "";
  const eventId = eventName && eventDate ? eventIdFrom(eventName, eventDate) : null;
  const signupUrl = eventId
    ? new URL(`/meet?event=${eventId}`, process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).toString()
    : null;
  const submitted = name !== undefined || date !== undefined;

  return (
    <main className="v2 v2-meet v2-event-links">
      <V2Scene>
        <div className="v2-meet__wrap">
          <Link className="v2-meet__brand v2-pixel" href="/">CUSEC <span>2027</span></Link>
          <section className="v2-glass v2-meet__card" aria-labelledby="event-links-title">
            {session?.user && <Link className="v2-event-links__back" href="/admin">{t("dashboard")}</Link>}
            <p className="v2-meet__eyebrow">{t("eyebrow")}</p>
            <h1 id="event-links-title" className="v2-pixel v2-meet__title">{t("title")}</h1>
            {!session?.user ? (
              <>
                <p className="v2-meet__intro">{t("sign-in-body")}</p>
                <a className="v2-btn v2-btn--primary" href={`/auth/login?returnTo=${encodeURIComponent(path)}`}>{t("sign-in")}</a>
              </>
            ) : (
              <>
                <p className="v2-meet__intro">{t("intro")}</p>
                <form className="v2-meet__form" action={path} method="get">
                  <label htmlFor="event-link-name">{t("name")}</label>
                  <input id="event-link-name" name="name" type="text" maxLength={100} defaultValue={eventName} placeholder={t("name-placeholder")} required />
                  <label htmlFor="event-link-date">{t("date")}</label>
                  <input id="event-link-date" name="date" type="date" defaultValue={eventDate} required />
                  <button className="v2-btn v2-btn--primary v2-meet__submit" type="submit">{t("generate")}</button>
                </form>
                {submitted && !signupUrl && <p className="v2-meet__error" role="alert">{t("invalid")}</p>}
                {signupUrl && eventId && (
                  <div className="v2-event-links__result" aria-live="polite">
                    <h2 className="v2-pixel">{t("ready")}</h2>
                    <p>{t("event-id")}: <strong>{eventId}</strong></p>
                    <CopyEventLink key={eventId} url={signupUrl} label={t("link")} copyLabel={t("copy")} copiedLabel={t("copied")} />
                    <div className="v2-event-links__actions">
                      <a href={signupUrl} target="_blank" rel="noopener noreferrer">{t("open")}</a>
                      {admin && <a href={`/api/admin/event-signups?event=${eventId}`}>{t("export")}</a>}
                    </div>
                    <p className="v2-event-links__hint">{t("hint")}</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </V2Scene>
    </main>
  );
}
