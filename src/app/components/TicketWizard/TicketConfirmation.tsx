"use client";

import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ProfileAnswers } from "@/lib/interface";
import { TICKET_LINKED_FLAG } from "@/lib/ticketLinkedFlag";
import ProfileLinksForm, { type ResumeMeta } from "./ProfileLinksForm";

interface TicketConfirmationProps {
  resume: ResumeMeta | null;
  ticketName: string | null;
  /** The CUSEC account the ticket is attached to. */
  accountName: string;
  accountEmail: string;
  /** SCAVENGER_HUNT_ENABLED without the staff bypass. */
  huntOpen: boolean;
  /** Absolute site URL; Auth0 needs a fully qualified returnTo. */
  baseURL: string;
  profile: ProfileAnswers | null;
}

/**
 * Shown once the ticket is linked, both straight after checkout and on any
 * later visit to /tickets. It says which account holds the ticket, since
 * that is the account to sign in with at the conference, and offers the
 * optional profile completion underneath.
 *
 * With the hunt closed there is no dashboard to go to, so the one action signs
 * out to the /scavenger preview. That is safe: this only renders once the
 * ticket is linked server-side.
 */
export default function TicketConfirmation({
  ticketName,
  accountName,
  accountEmail,
  huntOpen,
  baseURL,
  profile,
  resume,
}: TicketConfirmationProps) {
  const t = useTranslations("TicketWizard");
  const signOutToHunt = `/auth/logout?returnTo=${encodeURIComponent(`${baseURL}/scavenger`)}`;

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

        {huntOpen ? (
          <Link href="/scavenger" className="cta-btn wizard-intro-cta">
            {t("purchase-go-to-dashboard")}
          </Link>
        ) : (
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href={signOutToHunt}
            className="cta-btn wizard-intro-cta"
            onClick={() => {
              try {
                sessionStorage.setItem(TICKET_LINKED_FLAG, "1");
              } catch {
                // private mode: the preview just skips the confirmation
              }
            }}
          >
            {t("purchase-go-to-hunt-info")}
          </a>
        )}
      </div>

      {profile && <ProfileLinksForm initial={profile} initialResume={resume} />}
    </div>
  );
}
