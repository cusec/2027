import { describe, expect, it } from "vitest";
import {
	buildIcs,
	formatHour,
	formatRange,
	gridBounds,
	icsStamp,
	montrealNow,
	rowFor,
	toMinutes,
} from "./scheduleTime";

describe("formatRange", () => {
	it("drops the first AM/PM when both ends share it", () => {
		expect(formatRange(toMinutes("09:30"), toMinutes("10:00"), "en-CA")).toBe("9:30 - 10:00 AM");
	});

	it("keeps both when the range crosses noon", () => {
		expect(formatRange(toMinutes("11:20"), toMinutes("12:05"), "en-CA")).toBe(
			"11:20 AM - 12:05 PM",
		);
	});

	it("uses 24-hour French times", () => {
		expect(formatRange(toMinutes("13:30"), toMinutes("14:00"), "fr-CA")).toBe("13 h 30 - 14 h 00");
	});
});

describe("formatHour", () => {
	it("labels noon and midnight-side hours", () => {
		expect(formatHour(12 * 60, "en-CA")).toBe("12 PM");
		expect(formatHour(8 * 60, "en-CA")).toBe("8 AM");
		expect(formatHour(17 * 60, "fr-CA")).toBe("17 h");
	});
});

describe("gridBounds", () => {
	it("starts on the hour and ends half an hour past the last session", () => {
		expect(
			gridBounds([
				{ start: "08:30", end: "09:25" },
				{ start: "16:30", end: "17:00" },
			]),
		).toEqual({ start: 8 * 60, end: 17 * 60 + 30 });
	});

	it("rounds a ragged last end up to the half hour first", () => {
		expect(gridBounds([{ start: "10:00", end: "17:15" }]).end).toBe(18 * 60);
	});
});

describe("rowFor", () => {
	it("maps five-minute steps onto 1-based rows", () => {
		expect(rowFor(8 * 60, 8 * 60)).toBe(1);
		expect(rowFor(9 * 60, 8 * 60)).toBe(13);
	});
});

describe("montrealNow", () => {
	it("converts a UTC instant to Montréal wall-clock time", () => {
		// 19:10 UTC on Jan 8 is 14:10 EST
		expect(montrealNow(new Date("2027-01-08T19:10:00Z"))).toEqual({
			date: "2027-01-08",
			minutes: 14 * 60 + 10,
		});
	});
});

describe("icsStamp", () => {
	it("writes EST wall-clock time as UTC", () => {
		expect(icsStamp("2027-01-07", toMinutes("08:30"))).toBe("20270107T133000Z");
	});

	it("rolls a late-night time onto the next UTC day", () => {
		expect(icsStamp("2027-01-07", toMinutes("23:45"))).toBe("20270108T044500Z");
	});
});

describe("buildIcs", () => {
	it("escapes text and uses CRLF line endings", () => {
		const ics = buildIcs(
			[
				{
					uid: "day-1@2027.cusec.net",
					date: "2027-01-07",
					start: toMinutes("08:30"),
					end: toMinutes("23:45"),
					title: "CUSEC 2027, day 1",
					location: "Montréal, QC",
					url: "https://2027.cusec.net/schedule",
				},
			],
			new Date("2026-10-18T00:00:00Z"),
		);
		expect(ics).toContain("SUMMARY:CUSEC 2027\\, day 1\r\n");
		expect(ics).toContain("DTSTART:20270107T133000Z\r\n");
		expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
		expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
	});
});
