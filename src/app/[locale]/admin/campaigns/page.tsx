import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import type { CampaignChannel } from "@/lib/campaigns";
import { Campaign, CampaignPurchase, EventSignup, User } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { previewOrigins } from "@/lib/previewOrigins";
import { SITE_URL } from "@/lib/seo";
import { hasVerifiedCusecEmail } from "@/lib/staffAccess";
import { getPathname, Link } from "@/i18n/navigation";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import CampaignLink from "./CampaignLink";
import CampaignForm from "./CampaignForm";

export const metadata: Metadata = {
  title: "Links & campaigns",
  robots: { index: false, follow: false },
};

type CampaignRow = {
  id: string;
  name: string;
  channel: CampaignChannel;
  destination: string;
  visits: number;
  createdAt: Date;
};

type CountRow = { _id: string; count: number };
type MeetupRow = { _id: string; signups: number };

export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; created?: string }>;
}) {
  const { locale } = await params;
  const { status, created } = await searchParams;
  const t = await getTranslations("V2.campaigns");
  const session = await auth0.getSession();
  const user = session?.user;
  const admin = user?.["cusec/roles"]?.includes("Admin") ?? false;
  if (user && !admin && !hasVerifiedCusecEmail(user)) notFound();

  let campaigns: CampaignRow[] = [];
  let accounts = new Map<string, number>();
  let purchases = new Map<string, number>();
  let campaignMeetups = new Map<string, number>();
  let meetups: MeetupRow[] = [];
  let loadError = false;

  if (user) {
    try {
      await connectMongoDB();
      campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(200)
        .select("id name channel destination visits createdAt")
        .lean<CampaignRow[]>();
      const ids = campaigns.map((campaign) => campaign.id);
      const [accountRows, purchaseRows, campaignMeetupRows, meetupRows] = await Promise.all([
        User.aggregate<CountRow>([
          { $match: { "attribution.firstTouch.campaign": { $in: ids } } },
          { $group: { _id: "$attribution.firstTouch.campaign", count: { $sum: 1 } } },
        ]),
        CampaignPurchase.aggregate<CountRow>([
          { $match: { campaignId: { $in: ids } } },
          { $group: { _id: "$campaignId", count: { $sum: 1 } } },
        ]),
        EventSignup.aggregate<CountRow>([
          { $match: { campaignId: { $in: ids } } },
          { $group: { _id: "$campaignId", count: { $sum: 1 } } },
        ]),
        EventSignup.aggregate<MeetupRow>([
          { $group: { _id: "$event", signups: { $sum: 1 } } },
          { $sort: { signups: -1 } },
        ]),
      ]);
      accounts = new Map(accountRows.map((row) => [row._id, row.count]));
      purchases = new Map(purchaseRows.map((row) => [row._id, row.count]));
      campaignMeetups = new Map(campaignMeetupRows.map((row) => [row._id, row.count]));
      meetups = meetupRows;
    } catch (error) {
      console.error("Campaign dashboard failed:", error);
      loadError = true;
    }
  }

  const origin = previewOrigins()[0] || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

  return (
    <main className="v2 v2-admin v2-campaign">
      <V2Scene>
        <div className="v2-admin__wrap v2-campaign__wrap">
          <Link className="v2-meet__brand v2-pixel" href="/">CUSEC <span>2027</span></Link>
          <section className="v2-glass v2-admin__panel">
            {user && <Link className="v2-admin__back" href="/admin">{t("back")}</Link>}
            <p className="v2-meet__eyebrow">{t("eyebrow")}</p>
            <h1 className="v2-pixel v2-admin__title">{t("title")}</h1>
            <p className="v2-admin__intro">{t("intro")}</p>
            {!user ? (
              <a className="v2-btn v2-btn--primary" href={`/auth/login?returnTo=${encodeURIComponent(getPathname({ locale, href: "/admin/campaigns" }))}`}>{t("sign-in")}</a>
            ) : (
              <>
                <section className="v2-campaign__section" aria-labelledby="campaign-create-title">
                  <h2 id="campaign-create-title" className="v2-pixel">{t("create-title")}</h2>
                  <CampaignForm
                    locale={locale}
                    namePlaceholder={t("name-placeholder")}
                    channelLabel={t("channel")}
                    meetupLabel={t("meetup")}
                    schoolLabel={t("school")}
                    socialLabel={t("social")}
                    partnerLabel={t("partner")}
                    destinationLabel={t("destination")}
                    destinationHint={t("destination-hint")}
                    createLabel={t("create")}
                  />
                  {status === "invalid" && <p className="v2-campaign__error" role="alert">{t("invalid")}</p>}
                  {status === "error" && <p className="v2-campaign__error" role="alert">{t("error")}</p>}
                  {created && <p className="v2-campaign__success" role="status">{t("created")}</p>}
                </section>

                <section className="v2-campaign__section" aria-labelledby="campaign-results-title">
                  <div className="v2-campaign__heading"><h2 id="campaign-results-title" className="v2-pixel">{t("results-title")}</h2><span>{t("campaigns-count", { count: campaigns.length })}</span></div>
                  <p className="v2-campaign__note">{t("metrics-note")}</p>
                  {loadError ? <p role="alert">{t("load-error")}</p> : campaigns.length === 0 ? <p>{t("empty")}</p> : (
                    <div className="v2-campaign__list">
                      {campaigns.map((campaign) => {
                        const url = new URL(`/api/c/${campaign.id}`, origin).toString();
                        return <article className="v2-campaign__row" key={campaign.id}>
                          <div className="v2-campaign__row-head"><div><span className="v2-campaign__tag">{t(campaign.channel)}</span><h3>{campaign.name}</h3><p>{campaign.destination}</p></div><span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(campaign.createdAt))}</span></div>
                          <div className="v2-campaign__stats">
                            <div><strong>{campaign.visits}</strong><span>{t("visits")}</span></div>
                            <div><strong>{campaignMeetups.get(campaign.id) ?? 0}</strong><span>{t("meetup-signups")}</span></div>
                            <div><strong>{accounts.get(campaign.id) ?? 0}</strong><span>{t("accounts")}</span></div>
                            <div><strong>{purchases.get(campaign.id) ?? 0}</strong><span>{t("purchases")}</span></div>
                          </div>
                          <CampaignLink url={url} copyLabel={t("copy")} copiedLabel={t("copied")} qrLabel={t("qr")} />
                        </article>;
                      })}
                    </div>
                  )}
                </section>

                <section className="v2-campaign__section" aria-labelledby="meetup-results-title">
                  <h2 id="meetup-results-title" className="v2-pixel">{t("meetups-title")}</h2>
                  <p className="v2-campaign__note">{t("meetups-note")}</p>
                  {loadError ? <p role="alert">{t("load-error")}</p> : meetups.length === 0 ? <p>{t("meetups-empty")}</p> : <div className="v2-campaign__meetups">
                    {meetups.map((meetup) => <div key={meetup._id}><span>{meetup._id}</span><strong>{meetup.signups} {t("signups")}</strong>{admin && <a href={`/api/admin/event-signups?event=${encodeURIComponent(meetup._id)}`}>{t("export")}</a>}</div>)}
                  </div>}
                </section>
              </>
            )}
          </section>
        </div>
      </V2Scene>
    </main>
  );
}
