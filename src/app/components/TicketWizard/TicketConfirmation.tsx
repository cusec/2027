"use client";

import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import TravelLocationCard, { type TravelLocationValue } from "./TravelLocationCard";

interface TicketConfirmationProps {
  ticketName: string | null;
  accountName: string;
  accountEmail: string;
  huntOpen: boolean;
  baseURL: string;
  /** Set only when the delegate's location is missing - see TravelLocationCard. */
  location?: TravelLocationValue | null;
}

export default function TicketConfirmation({
  ticketName,
  accountName,
  accountEmail,
  huntOpen,
  baseURL,
  location = null,
}: TicketConfirmationProps) {
  const t = useTranslations("TicketWizard");
  const signOutHome = `/auth/logout?returnTo=${encodeURIComponent(`${baseURL}/`)}`;

  return (
    <div className="wizard-confirm">
      <div className="wizard-confirm-card">
        <CircleCheck className="wizard-confirm-card__icon" aria-hidden="true" />
        <h2 className="wizard-confirm-card__title">{t("confirm-heading")}</h2>
        <p>
          {ticketName
            ? t("purchase-already-complete-named", { ticket: ticketName })
            : t("purchase-already-complete")}
        </p>

        <dl className="wizard-account">
          <div>
            <dt>{t("confirm-name")}</dt>
            <dd>{accountName}</dd>
          </div>
          <div>
            <dt>{t("confirm-email")}</dt>
            <dd>{accountEmail}</dd>
          </div>
          {ticketName && (
            <div>
              <dt>{t("confirm-ticket")}</dt>
              <dd>{ticketName}</dd>
            </div>
          )}
        </dl>

        <p className="wizard-confirm-card__note">{t("confirm-account-note")}</p>

        {location && <TravelLocationCard initial={location} />}

        {huntOpen ? (
          <Link href="/scavenger" className="cta-btn wizard-intro-cta">
            {t("purchase-go-to-dashboard")}
          </Link>
        ) : (
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href={signOutHome} className="cta-btn wizard-intro-cta">
            {t("purchase-go-to-hunt-info")}
          </a>
        )}
      </div>
    </div>
  );
}
