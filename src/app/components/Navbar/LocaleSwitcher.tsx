"use client";

import {useLocale} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";

const LOCALES = ["en-CA", "fr-CA"] as const;

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function onChange(nextLocale: string) {
    router.replace(pathname, {locale: nextLocale});
  }

  return (
    <label className="Navbar-locale-switcher">
      <span className="Navbar-locale-label">Locale</span>
      <select
        className="Navbar-locale-select"
        value={locale}
        onChange={(event) => onChange(event.target.value)}
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}