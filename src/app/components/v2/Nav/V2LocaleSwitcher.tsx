"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe, ChevronDown } from "lucide-react";

const LOCALES = ["en-CA", "fr-CA"] as const;

const SHORT: Record<string, string> = {
	"en-CA": "EN",
	"fr-CA": "FR",
};

/**
 * Locale is resolved from the Accept-Language header / cookie (localePrefix is
 * 'never'), so this control is the only way for a visitor to switch language.
 *
 * The <select> is stretched invisibly over the whole pill so a click anywhere
 * on the control opens it, not just on the label text. The icon and label
 * underneath are purely presentational.
 */
export default function V2LocaleSwitcher({ label }: { label: string }) {
	const locale = useLocale();
	const pathname = usePathname();
	const router = useRouter();

	return (
		<div className="v2-locale">
			<Globe size={16} strokeWidth={1.9} aria-hidden="true" />
			<span className="v2-locale__value" aria-hidden="true">
				{SHORT[locale] ?? locale}
			</span>
			<ChevronDown size={13} strokeWidth={2.2} aria-hidden="true" />

			<select
				className="v2-locale__select"
				value={locale}
				onChange={(e) => router.replace(pathname, { locale: e.target.value })}
				aria-label={label}
			>
				{LOCALES.map((value) => (
					<option key={value} value={value}>
						{value === "en-CA" ? "English" : "Français"}
					</option>
				))}
			</select>
		</div>
	);
}
