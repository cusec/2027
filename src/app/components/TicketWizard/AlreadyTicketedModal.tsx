"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface AlreadyTicketedModalProps {
  /** The account the ticket is attached to, so the user knows which to leave. */
  email: string;
  /** Name of the ticket they already hold, when the webhook captured it. */
  ticketName?: string | null;
  /** Absolute site URL — Auth0 requires a fully-qualified returnTo. */
  baseURL: string;
}

/**
 * Shown instead of the demographics form when the signed-in account already
 * holds a ticket.
 *
 * This replaces an earlier behaviour where the wizard let a ticketed user walk
 * back through the survey with an empty form — it looked like their answers
 * had been lost, and re-submitting would overwrite them. One ticket per
 * account is the rule, so buying another means signing in as someone else.
 */
export default function AlreadyTicketedModal({
  email,
  ticketName,
  baseURL,
}: AlreadyTicketedModalProps) {
  const t = useTranslations("TicketWizard");

  return (
    <div
      className="wizard-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="already-ticketed-heading"
    >
      <div className="wizard-modal">
        <h2 id="already-ticketed-heading" className="wizard-modal-heading">
          {t("already-ticketed-heading")}
        </h2>

        <p className="wizard-modal-body">
          {ticketName
            ? t("already-ticketed-body-named", { email, ticket: ticketName })
            : t("already-ticketed-body", { email })}
        </p>

        <p className="wizard-modal-body">{t("already-ticketed-instruction")}</p>

        <div className="wizard-modal-actions">
          {/*
            Auth0 owns /auth/*, so this must be a real document request —
            a client-side Link would never reach the logout handler.
          */}
          <a
            className="cta-btn"
            href={`/auth/logout?returnTo=${encodeURIComponent(`${baseURL}/tickets`)}`}
          >
            {t("already-ticketed-logout")}
          </a>

          <Link className="cta-btn wizard-form-back" href="/scavenger">
            {t("already-ticketed-dashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
