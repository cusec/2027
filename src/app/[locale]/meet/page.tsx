import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import { Link } from "@/i18n/navigation";
import { EVENT_ID_PATTERN } from "@/lib/eventLinks";

export const metadata: Metadata = {
  title: "Meet CUSEC 2027",
  robots: { index: false, follow: false },
};

export default async function MeetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { event, status } = await searchParams;
  const t = await getTranslations("V2.meet");
  const validEvent = typeof event === "string" && EVENT_ID_PATTERN.test(event);

  return (
    <main className="v2 v2-meet">
      <V2Scene>
        <div className="v2-meet__wrap">
          <Link className="v2-meet__brand v2-pixel" href="/" aria-label="CUSEC 2027">
            CUSEC <span>2027</span>
          </Link>
          <section className="v2-glass v2-meet__card" aria-labelledby="meet-title">
            <img
              className="v2-meet__mark"
              src="/assets/v2/logo-icosahedron.webp"
              alt=""
              width={88}
              height={88}
              aria-hidden="true"
            />
            {status === "saved" && validEvent ? (
              <>
                <p className="v2-meet__eyebrow">{t("done-eyebrow")}</p>
                <h1 id="meet-title" className="v2-pixel v2-meet__title">{t("done-title")}</h1>
                <p className="v2-meet__intro">{t("done-body")}</p>
              </>
            ) : !validEvent ? (
              <>
                <h1 id="meet-title" className="v2-pixel v2-meet__title">{t("missing-title")}</h1>
                <p className="v2-meet__intro">{t("missing-body")}</p>
              </>
            ) : (
              <>
                <p className="v2-meet__eyebrow">{t("eyebrow")}</p>
                <h1 id="meet-title" className="v2-pixel v2-meet__title">{t("title")}</h1>
                <p className="v2-meet__intro">{t("intro")}</p>
                <form className="v2-meet__form" action="/api/event-signups" method="post">
                  <input type="hidden" name="event" value={event} />
                  <input type="hidden" name="locale" value={locale} />
                  <label htmlFor="meet-email">{t("email")}</label>
                  <input id="meet-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder={t("email-placeholder")} maxLength={254} required autoFocus />
                  <label htmlFor="meet-name">{t("name")}</label>
                  <input id="meet-name" name="name" type="text" autoComplete="name" maxLength={120} placeholder={t("name-placeholder")} />
                  <label className="v2-meet__consent" htmlFor="meet-consent">
                    <input id="meet-consent" name="consent" type="checkbox" value="yes" required aria-required="true" />
                    <span>{t("consent")} <strong className="v2-meet__required">{t("required")}</strong></span>
                  </label>
                  {status === "invalid" && <p className="v2-meet__error" role="alert">{t("invalid")}</p>}
                  {status === "error" && <p className="v2-meet__error" role="alert">{t("error")}</p>}
                  <button className="v2-btn v2-btn--primary v2-meet__submit" type="submit">{t("submit")}</button>
                </form>
                <p className="v2-meet__note"><Link href="/privacy-policy">{t("privacy")}</Link></p>
              </>
            )}
          </section>
        </div>
      </V2Scene>
    </main>
  );
}
