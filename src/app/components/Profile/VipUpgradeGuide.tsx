"use client";

import Image from "next/image";
import VipEmbeddedCheckout from "./VipEmbeddedCheckout";
import { useTranslations } from "next-intl";

interface Props {
  checkout: { configured: boolean; checkoutUrl: string; checkoutEmbedUrl: string | null; checkoutEmail: string } | null;
  isVip: boolean;
  checking: boolean;
  message: string;
  purchased: () => void;
}
export default function VipUpgradeGuide({ checkout, isVip, checking, message, purchased }: Props) {
  const t = useTranslations("AttendeeProfile");
  const available = !!checkout?.configured && !!checkout.checkoutEmbedUrl;
  if (isVip) return <p role="status">{t("vip-confirmed")}</p>;
  return <div className="vip-assistant">
    <div className="vip-assistant__email"><div><span>{t("vip-use-email")}</span><strong>{checkout?.checkoutEmail || t("vip-email-loading")}</strong></div>
    </div>
    <aside className="vip-assistant__tips" aria-label={t("vip-cubear-guide")}>
      <Image src="/assets/v2/cubear/cubear-default.webp" alt="" width={180} height={180} />
      <ol className="vip-timeline">
        {[0, 1, 2].map(index => <li key={index}>
          <span className="vip-timeline__number" aria-hidden="true">{index + 1}</span>
          <div><h3>{t(`vip-timeline-title-${index}`)}</h3><p>{t(`vip-timeline-body-${index}`)}</p></div>
        </li>)}
      </ol>
    </aside>
    <div className="vip-assistant__checkout">
      {available ? <VipEmbeddedCheckout src={checkout!.checkoutEmbedUrl!} fallbackUrl={checkout!.checkoutUrl} />
        : <p role="status">{!checkout ? t("vip-loading-checkout") : checking ? t("vip-checking") : message || t("vip-unconfigured")}</p>}
    </div>
    <div className="vip-assistant__footer"><p>{t("vip-embedded-hint")}</p><button className="pass-button pass-button--lime" disabled={!available} onClick={purchased}>{t("vip-purchased")}</button></div>
  </div>;
}
