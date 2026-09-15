"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function StepHeader({
  title,
  note,
  tone = "note",
  current,
  total,
}: {
  title: string;
  note?: string;
  tone?: "note" | "confidential";
  current?: number;
  total?: number;
}) {
  const t = useTranslations("TicketWizard");
  return (
    <div className="tickets-header wizard-step-header">
      <h1 className="tickets-heading">{title}</h1>
      {note && <p className={`wizard-note-pill wizard-note-pill--${tone}`}>{note}</p>}
      {current !== undefined && total !== undefined && total > 1 && (
        <p className="wizard-section-count">
          {t("section-count", { current, total })}
        </p>
      )}
    </div>
  );
}

export function StepActions({
  submitLabel,
  busy,
  error,
  onBack,
  backHref,
}: {
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onBack?: () => void;
  backHref?: string;
}) {
  const t = useTranslations("TicketWizard");
  return (
    <>
      {error && (
        <p className="wizard-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="wizard-form-actions">
        {onBack && (
          <button type="button" className="cta-btn wizard-form-back" onClick={onBack}>
            {t("back-button")}
          </button>
        )}
        {!onBack && backHref && (
          <Link href={backHref} className="cta-btn wizard-form-back">
            {t("back-button")}
          </Link>
        )}
        <button type="submit" className="cta-btn wizard-form-submit" disabled={busy}>
          {busy ? t("submitting") : submitLabel}
        </button>
      </div>
    </>
  );
}
