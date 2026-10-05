"use client";

import { useTranslations } from "next-intl";
import { POSTAL_REQUIRED_COUNTRIES } from "@/lib/ticketWizardOptions";
import { Question } from "./WizardFields";

const PLACEHOLDER: Record<string, string> = { CA: "H3A 0G4", US: "10001" };

/**
 * Postal code for the MTL Business Events participant report (see AGENTS.md).
 * Required in Canada and the US, optional elsewhere - the server applies the
 * same rule through normalizePostalCode. The id is "postalCode" so the
 * wizard's focusField() can jump to it when the API rejects the value.
 */
export default function PostalCodeField({
	country,
	value,
	invalid = false,
	onChange,
}: {
	country: string;
	value: string;
	invalid?: boolean;
	onChange: (next: string) => void;
}) {
	const t = useTranslations("TicketWizard");
	const required = POSTAL_REQUIRED_COUNTRIES.includes(country);

	return (
		<Question
			label={t("q-postal-code")}
			hint={invalid ? t("error-postalCode") : t("postal-hint")}
			htmlFor="postalCode"
			required={required}
		>
			<input
				id="postalCode"
				className="wizard-input wizard-postal"
				type="text"
				inputMode={country === "US" ? "numeric" : "text"}
				autoComplete="postal-code"
				autoCapitalize="characters"
				spellCheck={false}
				maxLength={12}
				placeholder={PLACEHOLDER[country] ?? ""}
				required={required}
				aria-invalid={invalid || undefined}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</Question>
	);
}
