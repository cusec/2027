import { describe, expect, it } from "vitest";
import { clashes, parseDay, parseSession, trackSpan, tracksFor, type Session } from "./schedule";

const session = (over: Partial<Session>): Session => ({
	id: "x",
	start: "10:00",
	end: "11:00",
	title: "Talk",
	track: "A",
	category: "talk",
	afterHours: false,
	...over,
});

describe("trackSpan / tracksFor", () => {
	it("maps tracks to column runs", () => {
		expect(trackSpan("A")).toEqual([0, 0]);
		expect(trackSpan("BC")).toEqual([1, 2]);
		expect(trackSpan("ABC")).toEqual([0, 2]);
	});

	it("only offers spans that fit the day's rooms", () => {
		expect(tracksFor(1)).toEqual(["A"]);
		expect(tracksFor(2)).toEqual(["A", "B", "AB"]);
		expect(tracksFor(3)).toHaveLength(6);
	});
});

describe("clashes", () => {
	it("catches a spanning session over a single-room one", () => {
		expect(clashes(session({ track: "ABC" }), session({ track: "B", start: "10:30" }))).toBe(true);
	});

	it("allows back-to-back sessions and separate rooms", () => {
		expect(clashes(session({}), session({ start: "11:00", end: "11:30" }))).toBe(false);
		expect(clashes(session({ track: "A" }), session({ track: "BC" }))).toBe(false);
	});

	it("never counts after-hours events", () => {
		expect(clashes(session({ afterHours: true }), session({}))).toBe(false);
	});
});

describe("parseSession", () => {
	const valid = { title: " Keynote ", start: "09:00", end: "09:55", track: "A", category: "keynote" };

	it("trims and drops empty optional fields", () => {
		const result = parseSession({ ...valid, titleFr: "" }, 2);
		expect(result).toEqual({
			ok: true,
			value: expect.objectContaining({ title: "Keynote", titleFr: undefined, afterHours: false }),
		});
	});

	it("rejects a span the day doesn't have", () => {
		expect(parseSession({ ...valid, track: "BC" }, 2)).toMatchObject({ ok: false });
	});

	it("rejects an end before the start and bad photo URLs", () => {
		expect(parseSession({ ...valid, end: "08:00" }, 1)).toMatchObject({ ok: false });
		expect(parseSession({ ...valid, photo: "javascript:alert(1)" }, 1)).toMatchObject({ ok: false });
	});

	it("keeps grid sessions inside 9 AM to 10 PM", () => {
		expect(parseSession({ ...valid, start: "08:30", end: "09:25" }, 1)).toMatchObject({ ok: false });
		expect(parseSession({ ...valid, start: "21:30", end: "22:30" }, 1)).toMatchObject({ ok: false });
		expect(parseSession({ ...valid, start: "21:00", end: "22:00" }, 1)).toMatchObject({ ok: true });
	});

	it("lets after-hours events run to midnight whatever the track", () => {
		expect(
			parseSession({ ...valid, start: "21:00", end: "24:00", track: "ZZ", afterHours: true }, 1),
		).toMatchObject({ ok: true, value: { track: "A", afterHours: true } });
	});
});

describe("parseDay", () => {
	it("accepts one to three rooms", () => {
		expect(parseDay({ date: "2027-01-07", rooms: ["Main stage", " "] })).toEqual({
			ok: true,
			value: { date: "2027-01-07", rooms: ["Main stage"], afterHoursFrom: undefined },
		});
		expect(parseDay({ date: "2027-01-07", rooms: ["a", "b", "c", "d"] })).toMatchObject({ ok: false });
	});

	it("rejects a malformed date", () => {
		expect(parseDay({ date: "Jan 7", rooms: ["Main"] })).toMatchObject({ ok: false });
	});
});
