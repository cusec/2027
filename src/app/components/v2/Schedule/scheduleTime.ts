/**
 * Pure time helpers for the schedule. Every time in scheduleData.ts is a
 * 24-hour "HH:MM" wall-clock string in Montréal time; nothing here touches the
 * visitor's own time zone except `montrealNow`, which converts *to* Montréal.
 */

export const EVENT_TIME_ZONE = "America/Toronto";

/** Grid resolution: one row per five minutes. */
export const SLOT_MINUTES = 5;

export function toMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

function parts(minutes: number) {
	const h24 = Math.floor(minutes / 60) % 24;
	return { h24, m: minutes % 60, pm: h24 >= 12, h12: h24 % 12 || 12 };
}

/** "9:30 AM" / "9 h 30". `suffix: false` drops the AM/PM in English. */
export function formatTime(minutes: number, locale: string, suffix = true): string {
	const { h24, m, pm, h12 } = parts(minutes);
	if (locale === "fr-CA") return `${h24} h ${String(m).padStart(2, "0")}`;
	return `${h12}:${String(m).padStart(2, "0")}${suffix ? (pm ? " PM" : " AM") : ""}`;
}

/** "9:30 - 10:00 AM", "11:20 AM - 12:05 PM", "9 h 30 - 10 h 00". */
export function formatRange(start: number, end: number, locale: string): string {
	const sameHalf = parts(start).pm === parts(end).pm;
	return `${formatTime(start, locale, !sameHalf)} - ${formatTime(end, locale)}`;
}

/** Axis label: "8 AM" / "8 h". */
export function formatHour(minutes: number, locale: string): string {
	const { h24, pm, h12 } = parts(minutes);
	return locale === "fr-CA" ? `${h24} h` : `${h12} ${pm ? "PM" : "AM"}`;
}

/**
 * The span the timeline draws: from the hour at or before the first session
 * to half an hour past the last one (rounded to the half hour), so the final
 * block never sits flush on the bottom edge.
 */
export function gridBounds(sessions: { start: string; end: string }[]) {
	const starts = sessions.map((s) => toMinutes(s.start));
	const ends = sessions.map((s) => toMinutes(s.end));
	const start = Math.floor(Math.min(...starts) / 60) * 60;
	const end = Math.ceil(Math.max(...ends) / 30) * 30 + 30;
	return { start, end };
}

/** 1-based grid row a time falls on, given the grid's first minute. */
export function rowFor(minutes: number, gridStart: number): number {
	return Math.round((minutes - gridStart) / SLOT_MINUTES) + 1;
}

/** Today's date ("2027-01-08") and minute of the day in Montréal. */
export function montrealNow(now: Date): { date: string; minutes: number } {
	const fields = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: EVENT_TIME_ZONE,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		})
			.formatToParts(now)
			.map((p) => [p.type, p.value]),
	);
	return {
		date: `${fields.year}-${fields.month}-${fields.day}`,
		minutes: Number(fields.hour) * 60 + Number(fields.minute),
	};
}

/**
 * A wall-clock Montréal time as an iCalendar UTC stamp. The conference is in
 * January, so Montréal is on EST (UTC-5) throughout; a time past midnight
 * (an after-hours end) rolls onto the next day.
 */
export function icsStamp(date: string, minutes: number): string {
	const [y, mo, d] = date.split("-").map(Number);
	const utc = new Date(Date.UTC(y, mo - 1, d, 0, minutes + 5 * 60));
	return utc.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export type CalendarEntry = {
	uid: string;
	date: string;
	start: number;
	end: number;
	title: string;
	location: string;
	url: string;
};

/** A minimal RFC 5545 calendar. CRLF line endings are required by the spec. */
export function buildIcs(entries: CalendarEntry[], stamp: Date): string {
	const now = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//CUSEC//CUSEC 2027//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		...entries.flatMap((e) => [
			"BEGIN:VEVENT",
			`UID:${e.uid}`,
			`DTSTAMP:${now}`,
			`DTSTART:${icsStamp(e.date, e.start)}`,
			`DTEND:${icsStamp(e.date, e.end)}`,
			`SUMMARY:${icsEscape(e.title)}`,
			`LOCATION:${icsEscape(e.location)}`,
			`URL:${e.url}`,
			"END:VEVENT",
		]),
		"END:VCALENDAR",
	];
	return `${lines.join("\r\n")}\r\n`;
}
