/**
 * Copy that lives in a data file (team roles, session titles, speaker bios)
 * rather than in messages/. A plain string is the same in both languages -
 * names, company names, talk titles - and an object carries both.
 */
export type Localized = string | { "en-CA": string; "fr-CA": string };

export function pick(value: Localized, locale: string): string {
	if (typeof value === "string") return value;
	return locale === "fr-CA" ? value["fr-CA"] : value["en-CA"];
}
