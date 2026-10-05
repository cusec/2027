import { City, Country, State } from "country-state-city";

/*
 * The MTL Business Events participant report. The contract pays CUSEC $35
 * per delegate travelling from more than 100 km outside Montréal (up to 350
 * delegates), 60 days after we submit a report with, for each attendee:
 * an id (no first or last name - we use the Ticket Tailor ticket id), city,
 * province, country and postal code. See AGENTS.md.
 *
 * Pure: the route (src/app/api/admin/participant-report) does the I/O and
 * hands this module plain data, so the joining rules are unit-tested.
 */

export interface ReportAdmission {
	id: string;
	orderId: string | null;
	description: string | null;
}

export interface ReportAccount {
	orderId: string;
	/** The delegate's own issued ticket, when known (group-order delegates, one-ticket orders). */
	ticketId?: string | null;
	email: string;
	location: {
		travelCountry?: string;
		travelRegion?: string;
		travelCity?: string;
		postalCode?: string;
	} | null;
}

export interface ParticipantRow {
	ticketId: string;
	orderId: string;
	ticketType: string;
	accountEmail: string;
	city: string;
	province: string;
	country: string;
	postalCode: string;
	kmFromMontreal: number | null;
	/** What still has to be chased before the report is complete. */
	missing: string[];
}

/** Montréal's centre, as country-state-city has it. */
const MONTREAL = { lat: 45.50008, lng: -73.68248 };
export const ELIGIBLE_KM = 100;

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
	const rad = (d: number) => (d * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function kmFromMontreal(country: string, region: string, city: string): number | null {
	if (!country || !city) return null;
	const match = (region ? City.getCitiesOfState(country, region) : City.getCitiesOfCountry(country) ?? [])
		.find((c) => c.name === city);
	if (!match?.latitude || !match.longitude) return null;
	return Math.round(distanceKm(MONTREAL, { lat: Number(match.latitude), lng: Number(match.longitude) }));
}

const ticketNumber = (id: string) => Number(id.replace(/^\D+/, "")) || 0;

/**
 * Test tickets from setting up the box office ("[TEST ORDER – NOT VALID] ...",
 * "Testing - ...") are not attendees and must not reach the MTL report.
 */
export function isTestTicket(description: string | null): boolean {
	return /\btest(ing)?\b/i.test(description ?? "");
}

/**
 * One row per admission ticket (test tickets excluded). Each account is
 * joined to its own ticket when it knows it (purchasedTicketId - every
 * delegate linked through a group order, and one-ticket orders). An account
 * that only knows its order (a buyer linked before ticket ids were recorded)
 * takes the first of that order's tickets nobody else has claimed. Tickets
 * left over have no CUSEC account yet - typically group-order delegates who
 * haven't signed in with the email on their ticket.
 */
export function buildParticipantRows(
	admissions: ReportAdmission[],
	accounts: ReportAccount[],
): ParticipantRow[] {
	const tickets = admissions
		.filter((t) => !isTestTicket(t.description))
		.sort((a, b) => ticketNumber(a.id) - ticketNumber(b.id));
	const ticketIds = new Set(tickets.map((t) => t.id));

	const owners = new Map<string, ReportAccount>();
	for (const account of accounts) {
		if (account.ticketId && ticketIds.has(account.ticketId) && !owners.has(account.ticketId)) {
			owners.set(account.ticketId, account);
		}
	}
	const placed = new Set(owners.values());
	for (const account of accounts) {
		if (placed.has(account)) continue;
		const free = tickets.find((t) => t.orderId === account.orderId && !owners.has(t.id));
		if (free) {
			owners.set(free.id, account);
			placed.add(account);
		}
	}

	return tickets.map((ticket) => {
			const order = ticket.orderId ?? "";
			const owner = owners.get(ticket.id);

			const country = owner?.location?.travelCountry ?? "";
			const region = owner?.location?.travelRegion ?? "";
			const city = owner?.location?.travelCity ?? "";
			const postalCode = owner?.location?.postalCode ?? "";

			const missing: string[] = [];
			if (!owner) missing.push("cusec-account");
			else {
				if (!city) missing.push("city");
				if (!postalCode) missing.push("postal-code");
			}

			return {
				ticketId: ticket.id,
				orderId: order,
				ticketType: ticket.description ?? "",
				accountEmail: owner?.email ?? "",
				city,
				province: region ? (State.getStateByCodeAndCountry(region, country)?.name ?? region) : "",
				country: country ? (Country.getCountryByCode(country)?.name ?? country) : "",
				postalCode,
				kmFromMontreal: owner ? kmFromMontreal(country, region, city) : null,
				missing,
			};
		});
}

/** A CSV cell, quoted, with spreadsheet formulas neutralised. */
export function csvCell(value: string | number | null): string {
	const text = value === null ? "" : String(value);
	const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
	return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
	const lines = [header.join(","), ...rows.map((row) => row.map(csvCell).join(","))];
	return `﻿${lines.join("\r\n")}\r\n`;
}

/** The file submitted to MTL Business Events: the five contract fields only. */
export function reportCsv(rows: ParticipantRow[]): string {
	return toCsv(
		["ticket_id", "city", "province", "country", "postal_code"],
		rows.map((r) => [r.ticketId, r.city, r.province, r.country, r.postalCode]),
	);
}

/** The team's working copy: every ticket, what's missing, who to chase. */
export function workingCsv(rows: ParticipantRow[]): string {
	return toCsv(
		[
			"ticket_id", "order_id", "ticket_type", "account_email", "city", "province", "country",
			"postal_code", "km_from_montreal", "outside_100km", "missing",
		],
		rows.map((r) => [
			r.ticketId, r.orderId, r.ticketType, r.accountEmail, r.city, r.province, r.country, r.postalCode,
			r.kmFromMontreal,
			r.kmFromMontreal === null ? "unknown" : r.kmFromMontreal > ELIGIBLE_KM ? "yes" : "no",
			r.missing.join(" "),
		]),
	);
}
