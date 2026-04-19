"use client";

import { useTranslations } from "next-intl";

export function SplashContent() {
  const t = useTranslations("Splash");

  return (
    <div className="space-y-3">
      <h1 className="text-4xl font-bold text-green-600">{t("title")}</h1>
      <p className="text-lg font-medium">{t("subtitle")}</p>
      <p className="text-neutral-600">{t("date")}</p>
      <p className="max-w-2xl">{t("description")}</p>
      <button
        type="button"
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white"
      >
        {t("cta")}
      </button>
    </div>
  );
}
