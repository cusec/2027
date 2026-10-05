"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, MapPin } from "lucide-react";
import CityPicker from "./CityPicker";
import PostalCodeField from "./PostalCodeField";
import { Question, type Origin } from "./WizardFields";

export interface TravelLocationValue extends Origin {
	postalCode: string;
}

/**
 * The optional follow-up that asks someone already past the profile step -
 * including current ticket holders - where they're travelling from and their
 * postal code, for the MTL Business Events participant report (AGENTS.md).
 *
 * Rendered only when needsTravelLocation() says that information is missing,
 * and never in the way: it doesn't block, redirect or hide anything, and it
 * saves through PUT /api/demographics/location, which touches only these four
 * fields. Once saved it collapses to a thank-you.
 */
export default function TravelLocationCard({ initial }: { initial: TravelLocationValue }) {
	const t = useTranslations("TicketWizard");
	const [value, setValue] = useState<TravelLocationValue>(initial);
	const [busy, setBusy] = useState(false);
	const [saved, setSaved] = useState(false);
	const [badField, setBadField] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);

	const update = (patch: Partial<TravelLocationValue>) => {
		setValue((v) => ({ ...v, ...patch }));
		if (badField && badField in patch) setBadField(null);
		setFailed(false);
	};

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setBadField(null);
		setFailed(false);
		try {
			const res = await fetch("/api/demographics/location", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(value),
			});
			if (res.ok) {
				setSaved(true);
				return;
			}
			const body = await res.json().catch(() => ({}));
			if (typeof body.field === "string") setBadField(body.field);
			else setFailed(true);
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	};

	if (saved) {
		return (
			<p className="wizard-location wizard-location--done" role="status">
				<CircleCheck aria-hidden="true" />
				{t("location-card-saved")}
			</p>
		);
	}

	return (
		<form className="wizard-location" onSubmit={submit} aria-labelledby="wizard-location-heading">
			<h3 id="wizard-location-heading" className="wizard-location__heading">
				<MapPin aria-hidden="true" />
				{t("location-card-heading")}
			</h3>
			<p className="wizard-location__body">{t("location-card-body")}</p>

			<div className="wizard-location__fields">
				<Question label={t("q-travel-from")} htmlFor="travel-city" required>
					<CityPicker id="travel-city" value={value} onChange={update} />
				</Question>
				<PostalCodeField
					country={value.travelCountry}
					value={value.postalCode}
					invalid={badField === "postalCode"}
					onChange={(postalCode) => update({ postalCode })}
				/>
			</div>

			{(failed || (badField && badField !== "postalCode")) && (
				<p className="wizard-location__error" role="alert">
					{failed ? t("error-generic") : t("error-field")}
				</p>
			)}

			<button type="submit" className="cta-btn wizard-location__save" disabled={busy}>
				{busy ? t("location-card-saving") : t("location-card-save")}
			</button>
		</form>
	);
}
