"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";

const LOCALES = ["en-CA", "fr-CA"] as const;

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function onChange(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="Navbar-locale-switcher">
      <span className="Navbar-locale-icon" aria-hidden>
        <Globe size={18} strokeWidth={1.75} />
      </span>
      <div className="Navbar-locale-select-wrapper">
        <select
          className="Navbar-locale-select"
          value={locale}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Language"
        >
          {LOCALES.map((value) => (
            <option key={value} value={value}>
              {value === "en-CA" ? "English" : "Français"}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}