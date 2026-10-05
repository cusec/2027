import { describe, expect, it } from "vitest";
import { parseTravelLocation } from "../travelLocation";

const montreal = { travelCountry: "CA", travelRegion: "QC", travelCity: "Montréal" };

describe("parseTravelLocation", () => {
	it("accepts a complete Canadian location and normalises the postal code", () => {
		expect(parseTravelLocation({ ...montreal, postalCode: "h3a0g4" })).toEqual({
			ok: true,
			location: { ...montreal, postalCode: "H3A 0G4" },
		});
	});

	it("requires a postal code in Canada and the US", () => {
		expect(parseTravelLocation({ ...montreal, postalCode: "" })).toEqual({ ok: false, field: "postalCode" });
		expect(parseTravelLocation({ ...montreal, postalCode: "nope" })).toEqual({ ok: false, field: "postalCode" });
	});

	it("leaves the postal code optional elsewhere", () => {
		const paris = { travelCountry: "FR", travelRegion: "75C", travelCity: "Paris", postalCode: "" };
		expect(parseTravelLocation(paris)).toMatchObject({ ok: true });
	});

	it("rejects an unknown country, region or a missing city", () => {
		expect(parseTravelLocation({ ...montreal, travelCountry: "ZZ" })).toEqual({ ok: false, field: "travelCountry" });
		expect(parseTravelLocation({ ...montreal, travelRegion: "XX" })).toEqual({ ok: false, field: "travelRegion" });
		expect(parseTravelLocation({ ...montreal, travelCity: "", postalCode: "H3A 0G4" })).toEqual({ ok: false, field: "travelCity" });
	});
});
