import { Country, State } from "country-state-city";
import { TEXT_MAX, normalizePostalCode } from "./ticketWizardOptions";

/*
 * Where a delegate is travelling from: country, province/state, city and
 * postal code. Shared by the profile step (PUT /api/demographics, background
 * section) and the follow-up card for people who are already past that step
 * (PUT /api/demographics/location), so both validate exactly the same way.
 *
 * Server-only: country-state-city is far too big to ship to the browser.
 */

export interface TravelLocation {
	travelCountry: string;
	travelRegion: string;
	travelCity: string;
	postalCode: string;
}

export type LocationResult =
	| { ok: true; location: TravelLocation }
	| { ok: false; field: keyof TravelLocation };

const field = (answers: Record<string, unknown>, key: string) => {
	const raw = answers[key];
	return typeof raw === "string" ? raw.trim().slice(0, TEXT_MAX) : "";
};

export function parseTravelLocation(answers: Record<string, unknown>): LocationResult {
	const country = field(answers, "travelCountry").toUpperCase();
	if (!country || !Country.getCountryByCode(country)) {
		return { ok: false, field: "travelCountry" };
	}

	const hasRegions = State.getStatesOfCountry(country).length > 0;
	const region = field(answers, "travelRegion").toUpperCase();
	if (hasRegions && !region) return { ok: false, field: "travelRegion" };
	if (region && !State.getStateByCodeAndCountry(region, country)) {
		return { ok: false, field: "travelRegion" };
	}

	const city = field(answers, "travelCity");
	if (!city) return { ok: false, field: "travelCity" };

	const postalCode = normalizePostalCode(country, field(answers, "postalCode"));
	if (postalCode === null) return { ok: false, field: "postalCode" };

	return {
		ok: true,
		location: { travelCountry: country, travelRegion: region, travelCity: city, postalCode },
	};
}
