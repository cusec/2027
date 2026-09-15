"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const STEPS = ["account", "profile", "interests", "ticket"] as const;
type Step = (typeof STEPS)[number];

const PATH_STEP_MAP: Record<string, Step> = {
  "/tickets": "account",
  "/tickets/profile": "profile",
  "/tickets/interests": "interests",
  "/tickets/purchase": "ticket",
};

const BACK_TARGETS: Partial<Record<Step, string>> = {
  ticket: "/tickets/interests",
};

export default function WizardStepNav() {
  const t = useTranslations("TicketWizard");
  const pathname = usePathname();
  const currentStep = PATH_STEP_MAP[pathname] ?? "account";
  const currentIndex = STEPS.indexOf(currentStep);
  const backTarget = BACK_TARGETS[currentStep];

  return (
    <div className="wizard-nav">
      <div className="wizard-nav-actions">
        {backTarget ? (
          <Link href={backTarget} className="wizard-nav-btn">
            {t("nav-back")}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/" className="wizard-nav-btn wizard-nav-btn--cancel">
          {t("nav-cancel")}
        </Link>
      </div>

      <nav className="wizard-step-nav" aria-label={t("nav-label")}>
        {STEPS.map((step, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
          return (
            <div className="wizard-step-nav-item" key={step}>
              <span
                className={`wizard-step-pill wizard-step-pill--${state}`}
                aria-current={state === "active" ? "step" : undefined}
              >
                {t(`nav-${step}`)}
              </span>
              {index < STEPS.length - 1 && <span className="wizard-step-nav-connector" />}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
