import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Footer from "@/app/components/v2/Footer/V2Footer";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Arcade from "@/app/components/v2/Play/V2Arcade";
import { alternatesFor } from "@/lib/seo";
import "@/app/styles/v2/play.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "V2.play" });
  return { title: t("title"), description: t("subline"), alternates: alternatesFor(locale, "/play") };
}

export default async function PlayPage() {
  const t = await getTranslations("V2.play");
  return <div className="v2">
    <V2Nav />
    <V2Scene>
      <main className="v2-rally" id="top">
        <div className="v2-container">
          <header className="v2-rally__heading">
            <p className="v2-heading-pill">{t("eyebrow")}</p>
            <h1 className="v2-pixel">{t("title")}</h1>
            <p>{t("subline")}</p>
          </header>
          <V2Arcade />
        </div>
      </main>
    </V2Scene>
    <V2Footer />
  </div>;
}
