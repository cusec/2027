import { describe, expect, it } from "vitest";
import {
	buildParticipantRows,
	csvCell,
	distanceKm,
	reportCsv,
	workingCsv,
	type ReportAccount,
} from "../participantReport";

const kingston: ReportAccount = {
	orderId: "or_1",
	email: "a@example.com",
	location: { travelCountry: "CA", travelRegion: "ON", travelCity: "Kingston", postalCode: "K7L 3N6" },
};

describe("buildParticipantRows", () => {
	it("joins an account to its order's ticket with readable place names", () => {
		const [row] = buildParticipantRows([{ id: "it_10", orderId: "or_1", description: "Student" }], [kingston]);
		expect(row).toMatchObject({
			ticketId: "it_10",
			city: "Kingston",
			province: "Ontario",
			country: "Canada",
			postalCode: "K7L 3N6",
			missing: [],
		});
		expect(row.kmFromMontreal).toBeGreaterThan(200);
	});

	it("gives a group order's buyer only the first ticket", () => {
		const rows = buildParticipantRows(
			[
				{ id: "it_12", orderId: "or_1", description: null },
				{ id: "it_11", orderId: "or_1", description: null },
			],
			[kingston],
		);
		expect(rows.map((r) => r.ticketId)).toEqual(["it_11", "it_12"]);
		expect(rows[0].accountEmail).toBe("a@example.com");
		expect(rows[1].accountEmail).toBe("");
		expect(rows[1].missing).toEqual(["cusec-account"]);
	});

	it("joins a group-order delegate by their own ticket and the buyer to another", () => {
		const delegate: ReportAccount = { ...kingston, email: "d@example.com", orderId: "or_9", ticketId: "it_2" };
		const buyer: ReportAccount = { ...kingston, email: "hd@example.com", orderId: "or_9", ticketId: null };
		const rows = buildParticipantRows(
			[
				{ id: "it_1", orderId: "or_9", description: "HD Delegate" },
				{ id: "it_2", orderId: "or_9", description: "HD Delegate" },
				{ id: "it_3", orderId: "or_9", description: "HD Delegate" },
			],
			[buyer, delegate],
		);
		expect(rows.map((r) => r.accountEmail)).toEqual(["hd@example.com", "d@example.com", ""]);
	});

	it("leaves test tickets out entirely", () => {
		const rows = buildParticipantRows(
			[
				{ id: "it_1", orderId: "or_1", description: "[TEST ORDER – NOT VALID] Test ticket" },
				{ id: "it_2", orderId: "or_2", description: "Testing - EARLY BIRD" },
				{ id: "it_3", orderId: "or_3", description: "General Admission Tickets - EARLY BIRD: Student Admission" },
			],
			[],
		);
		expect(rows.map((r) => r.ticketId)).toEqual(["it_3"]);
	});

	it("flags what an account is still missing", () => {
		const [row] = buildParticipantRows(
			[{ id: "it_1", orderId: "or_2", description: null }],
			[{ orderId: "or_2", email: "b@example.com", location: { travelCountry: "CA", travelCity: "" } }],
		);
		expect(row.missing).toEqual(["city", "postal-code"]);
	});
});

describe("csv output", () => {
	it("keeps the MTL file to the five contract columns, with no names or emails", () => {
		const csv = reportCsv(buildParticipantRows([{ id: "it_10", orderId: "or_1", description: null }], [kingston]));
		const [header, line] = csv.replace("﻿", "").trim().split("\r\n");
		expect(header).toBe("ticket_id,city,province,country,postal_code");
		expect(line).not.toContain("example.com");
	});

	it("marks eligibility in the working sheet", () => {
		const csv = workingCsv(buildParticipantRows([{ id: "it_10", orderId: "or_1", description: null }], [kingston]));
		expect(csv).toContain('"yes"');
	});

	it("neutralises spreadsheet formulas", () => {
		expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
		expect(csvCell('a "b"')).toBe(`"a ""b"""`);
	});

	it("measures distance sensibly", () => {
		expect(Math.round(distanceKm({ lat: 45.5, lng: -73.57 }, { lat: 43.65, lng: -79.38 }))).toBeGreaterThan(490);
	});
});
