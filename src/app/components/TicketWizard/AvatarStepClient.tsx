"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * The avatar step renders the wizard's own shell rather than the scavenger
 * onboarding's `AvatarCustomize`. That component is a fixed inset-0 overlay
 * with its own painted background, which covered the wizard's step nav and
 * broke the run of pages sharing one backdrop. It stays as it is for the
 * onboarding flow, which is the only place that layout belongs.
 */
export default function AvatarStepClient() {
  const t = useTranslations("TicketWizard");
  const router = useRouter();

  const handleComplete = async () => {
    try {
      await fetch("/api/ticket-wizard/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "avatar" }),
      });
    } finally {
      router.push("/tickets/purchase");
    }
  };

  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("avatar-heading")}</h1>
        <p className="tickets-subheading">{t("avatar-subheading")}</p>
      </div>

      <div className="wizard-intro-card">
        <span className="wizard-avatar-mark" aria-hidden="true">
          🎨
        </span>
        <p>{t("avatar-body")}</p>
        <button type="button" className="cta-btn" onClick={handleComplete}>
          {t("continue-button")}
        </button>
      </div>
    </div>
  );
}
