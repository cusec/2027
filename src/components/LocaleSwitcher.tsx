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
    <label className="inline-flex items-center gap-2 rounded border px-3 py-1.5">
      <span className="text-sm">Locale</span>
      <select
        className="rounded border px-2 py-1 text-sm"
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