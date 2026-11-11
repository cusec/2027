import type { Metadata } from "next";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { listSpeakers } from "@/lib/speakers";
import { Link, getPathname } from "@/i18n/navigation";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import SpeakerForm from "./SpeakerForm";

export const metadata: Metadata = { title: "Speakers and keynotes", robots: { index: false, follow: false } };

export default async function SpeakersAdmin({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("V2.speakerAdmin");
  const session = await auth0.getSession();
  if (session?.user && !session.user["cusec/roles"]?.includes("Admin")) notFound();
  let speakers: Awaited<ReturnType<typeof listSpeakers>> = [];
  let loadError = false;
  if (session?.user) {
    try { speakers = await listSpeakers(); }
    catch { loadError = true; }
  }
  const newId = new Types.ObjectId().toString();
  return <main className="v2 v2-admin v2-campaign"><V2Scene><div className="v2-admin__wrap">
    <section className="v2-glass v2-admin__panel">
      <Link className="v2-admin__back" href="/admin">{t("back")}</Link>
      <h1 className="v2-pixel v2-admin__title">{t("title")}</h1>
      <p className="v2-admin__intro">{t("intro")}</p>
      {!session?.user ? <a className="v2-btn v2-btn--primary" href={`/auth/login?returnTo=${encodeURIComponent(getPathname({ locale, href: "/admin/speakers" }))}`}>{t("sign-in")}</a> : loadError ? <p role="alert">{t("load-error")}</p> : <>
        <Link href="/speakers">{t("view")}</Link>
        <section className="v2-campaign__section"><h2>{t("add")}</h2><SpeakerForm key={newId} id={newId} /></section>
        {speakers.map(speaker => <details className="v2-campaign__section" key={speaker._id}>
          <summary>{speaker.name} · {t(speaker.kind)} · {t(speaker.published ? "live" : "draft")}</summary>
          <SpeakerForm id={speaker._id} speaker={speaker} />
        </details>)}
      </>}
    </section>
  </div></V2Scene></main>;
}
