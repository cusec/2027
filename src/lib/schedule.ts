/**
 * The schedule as stored in the `days` collection, and the one set of rules
 * for what a valid day or session is. Client-safe (no Mongoose): the admin
 * editor on /schedule and the /api/schedule routes both import it, so they
 * always agree on what will be accepted.
 *
 * Columns are "tracks" A, B and C, the same as 2026, so last year's documents
 * still read. A day names its rooms in `rooms` (rooms[0] is track A). A
 * session's track is the run of columns it covers: "AB" spans the first two,
 * "ABC" every room (registration, breaks).
 */

export const TRACKS = ["A", "B", "C", "AB", "BC", "ABC"] as const;
export type Track = (typeof TRACKS)[number];

export const CATEGORIES = ["keynote", "talk", "workshop", "career", "community", "break"] as const;
export type SessionCategory = (typeof CATEGORIES)[number];

export const MAX_ROOMS = 3;

/**
 * Every day's grid runs 9 AM to 10 PM, whatever is on it, so the timeline is
 * the same height on every tab and doesn't jump as sessions are added. Grid
 * sessions must fit inside; later events go in the after-hours card.
 */
export const GRID_START = 9 * 60;
export const GRID_END = 22 * 60;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** after-hours events may end at or past midnight, written "24:00" */
const END_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Session = {
	id: string;
	start: string;
	end: string;
	title: string;
	titleFr?: string;
	description?: string;
	descriptionFr?: string;
	location?: string;
	track: Track;
	category: SessionCategory;
	photo?: string;
	afterHours: boolean;
};

export type ScheduleDay = {
	id: string;
	date: string;
	rooms: string[];
	afterHoursFrom?: string;
	sessions: Session[];
};

/** First and last column (0-based) a track covers. */
export function trackSpan(track: Track): [number, number] {
	const first = "ABC".indexOf(track[0]);
	return [first, first + track.length - 1];
}

export function tracksFor(roomCount: number): Track[] {
	return TRACKS.filter((track) => trackSpan(track)[1] < roomCount);
}

export function toMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

/** Two grid sessions clash when their times overlap and they share a column. */
export function clashes(a: Session, b: Session): boolean {
	if (a.afterHours || b.afterHours) return false;
	const [a0, a1] = trackSpan(a.track);
	const [b0, b1] = trackSpan(b.track);
	const sameColumn = a0 <= b1 && b0 <= a1;
	return sameColumn && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** YYYYMMDD, the `timestamp` the 2026 documents sort on. */
export function dateToTimestamp(date: string): number {
	return Number(date.replace(/-/g, ""));
}

export function timestampToDate(timestamp: number | string): string {
	const s = String(timestamp);
	return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const text = (value: unknown, max: number) =>
	typeof value === "string" ? value.trim().slice(0, max) : "";

/** Validates an incoming session against the day's room count. */
export function parseSession(
	input: unknown,
	roomCount: number,
): Result<Omit<Session, "id">> {
	if (!input || typeof input !== "object") return { ok: false, error: "Missing session" };
	const raw = input as Record<string, unknown>;

	const title = text(raw.title, 200);
	const start = text(raw.start, 5);
	const end = text(raw.end, 5);
	const afterHours = raw.afterHours === true;
	const track = (afterHours ? "A" : text(raw.track, 3)) as Track;
	const category = text(raw.category, 20) as SessionCategory;
	const photo = text(raw.photo, 500);

	if (!title) return { ok: false, error: "A title is required" };
	if (!TIME.test(start) || !END_TIME.test(end)) return { ok: false, error: "Times must be HH:MM" };
	if (toMinutes(end) <= toMinutes(start)) return { ok: false, error: "The end must be after the start" };
	if (!afterHours && (toMinutes(start) < GRID_START || toMinutes(end) > GRID_END)) {
		return {
			ok: false,
			error: "Sessions on the schedule must run between 9:00 AM and 10:00 PM. Tick \"After hours\" for anything later.",
		};
	}
	if (!CATEGORIES.includes(category)) return { ok: false, error: "Unknown category" };
	if (!tracksFor(roomCount).includes(track)) {
		return { ok: false, error: "That room span doesn't exist on this day" };
	}
	if (photo && !/^(https:\/\/|\/)/.test(photo)) {
		return { ok: false, error: "The photo must be an https:// URL or a /path" };
	}

	const optional = (value: string) => value || undefined;
	return {
		ok: true,
		value: {
			start,
			end,
			title,
			titleFr: optional(text(raw.titleFr, 200)),
			description: optional(text(raw.description, 300)),
			descriptionFr: optional(text(raw.descriptionFr, 300)),
			location: optional(text(raw.location, 120)),
			track,
			category,
			photo: optional(photo),
			afterHours,
		},
	};
}

export function parseDay(input: unknown): Result<Omit<ScheduleDay, "id" | "sessions">> {
	if (!input || typeof input !== "object") return { ok: false, error: "Missing day" };
	const raw = input as Record<string, unknown>;

	const date = text(raw.date, 10);
	const rooms = Array.isArray(raw.rooms)
		? raw.rooms.map((room) => text(room, 60)).filter(Boolean)
		: [];
	const afterHoursFrom = text(raw.afterHoursFrom, 5);

	if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
		return { ok: false, error: "The date must be YYYY-MM-DD" };
	}
	if (rooms.length < 1 || rooms.length > MAX_ROOMS) {
		return { ok: false, error: `Name between 1 and ${MAX_ROOMS} rooms` };
	}
	if (afterHoursFrom && !TIME.test(afterHoursFrom)) {
		return { ok: false, error: "The after-hours start must be HH:MM" };
	}

	return { ok: true, value: { date, rooms, afterHoursFrom: afterHoursFrom || undefined } };
}
