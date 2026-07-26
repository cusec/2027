"use client";

import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const STEPS = ["register", "demographics", "avatar", "purchase"] as const;
type Step = (typeof STEPS)[number];

const PATH_STEP_MAP: Record<string, Step> = {
  "/tickets": "register",
  "/tickets/demographics": "demographics",
  "/tickets/avatar": "avatar",
  "/tickets/purchase": "purchase",
};

export default function WizardStepNav() {
  const t = useTranslations("TicketWizard");
  const pathname = usePathname();
  const currentStep = PATH_STEP_MAP[pathname] ?? "register";
  const currentIndex = STEPS.indexOf(currentStep);

  return (
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
  );
}
