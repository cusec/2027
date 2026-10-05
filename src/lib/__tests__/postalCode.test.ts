import { describe, expect, it } from "vitest";
import { normalizePostalCode } from "../ticketWizardOptions";

describe("normalizePostalCode", () => {
	it("normalises Canadian codes to A1A 1A1", () => {
		expect(normalizePostalCode("CA", "h3a 0g4")).toBe("H3A 0G4");
		expect(normalizePostalCode("CA", "H3A0G4")).toBe("H3A 0G4");
		expect(normalizePostalCode("CA", " H3A-0G4 ")).toBe("H3A 0G4");
	});

	it("rejects invalid or missing Canadian codes", () => {
		expect(normalizePostalCode("CA", "D3A 0G4")).toBeNull(); // D is never a first letter
		expect(normalizePostalCode("CA", "12345")).toBeNull();
		expect(normalizePostalCode("CA", "")).toBeNull();
	});

	it("accepts US ZIP and ZIP+4", () => {
		expect(normalizePostalCode("US", "10001")).toBe("10001");
		expect(normalizePostalCode("US", "10001-1234")).toBe("10001-1234");
		expect(normalizePostalCode("US", "100011234")).toBe("10001-1234");
		expect(normalizePostalCode("US", "1000")).toBeNull();
		expect(normalizePostalCode("US", "")).toBeNull();
	});

	it("is optional but sanitised everywhere else", () => {
		expect(normalizePostalCode("GB", "sw1a 1aa")).toBe("SW1A 1AA");
		expect(normalizePostalCode("FR", "75001")).toBe("75001");
		expect(normalizePostalCode("FR", "")).toBe("");
		expect(normalizePostalCode("IN", "<script>")).toBeNull();
	});
});
