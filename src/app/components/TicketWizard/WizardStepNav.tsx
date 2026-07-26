"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const STEPS = ["register", "demographics", "avatar", "purchase"] as const;
type Step = (typeof STEPS)[number];

const PATH_STEP_MAP: Record<string, Step> = {
  "/tickets": "register",
  "/tickets/demographics": "demographics",
  "/tickets/avatar": "avatar",
  "/tickets/purchase": "purchase",
};

// Where "Back" goes from each step. Deliberately omits `demographics`: it's
// the first editable step, and /tickets just forwards to the first incomplete
// step, so a Back link there would bounce straight back and look broken.
const BACK_TARGETS: Partial<Record<Step, string>> = {
  avatar: "/tickets/demographics",
  purchase: "/tickets/avatar",
};

export default function WizardStepNav() {
  const t = useTranslations("TicketWizard");
  const pathname = usePathname();
  const currentStep = PATH_STEP_MAP[pathname] ?? "register";
  const currentIndex = STEPS.indexOf(currentStep);
  const backTarget = BACK_TARGETS[currentStep];

  return (
    <div className="wizard-nav">
      <nav className="wizard-step-nav" aria-label={t("nav-label")}>
        {STEPS.map((step, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
          return (
            <div className="wizard-step-nav-item" key={step}>
              <span className={`wizard-step-pill wizard-step-pill--${state}`}>
                {t(`nav-${step}`)}
              </span>
              {index < STEPS.length - 1 && <span className="wizard-step-nav-connector" />}
            </div>
          );
        })}
      </nav>

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
    </div>
  );
}
