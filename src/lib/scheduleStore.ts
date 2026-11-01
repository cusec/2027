// Server-only: imports Mongoose. Client code uses src/lib/schedule.ts.
import connectMongoDB from "./mongodb";
import { Day } from "./models";
import {
	CATEGORIES,
	MAX_ROOMS,
	timestampToDate,
	trackSpan,
	TRACKS,
	type ScheduleDay,
	type Session,
	type SessionCategory,
	type Track,
} from "./schedule";

type ItemDoc = {
	_id: { toString(): string };
	startTime: string;
	endTime: string;
	title: string;
	titleFr?: string;
	description?: string;
	descriptionFr?: string;
	location?: string;
	track: string;
	category?: string;
	photo?: string;
	afterHours?: boolean;
};

type DayDoc = {
	_id: { toString(): string };
	timestamp: number | string;
	rooms?: string[];
	afterHoursFrom?: string;
	schedule: ItemDoc[];
};

export function toSession(item: ItemDoc): Session {
	const track = (TRACKS as readonly string[]).includes(item.track) ? (item.track as Track) : "A";
	const category = (CATEGORIES as readonly string[]).includes(item.category ?? "")
		? (item.category as SessionCategory)
		: "talk";
	return {
		id: item._id.toString(),
		start: item.startTime,
		end: item.endTime,
		title: item.title,
		titleFr: item.titleFr || undefined,
		description: item.description || undefined,
		descriptionFr: item.descriptionFr || undefined,
		location: item.location || undefined,
		track,
		category,
		photo: item.photo || undefined,
		afterHours: item.afterHours === true,
	};
}

export function toScheduleDay(doc: DayDoc): ScheduleDay {
	const sessions = doc.schedule.map(toSession);
	// A 2026-shaped day has no room names; give it one column per track used.
	const rooms =
		doc.rooms && doc.rooms.length > 0
			? doc.rooms.slice(0, MAX_ROOMS)
			: Array.from(
					{ length: Math.max(1, ...sessions.map((s) => trackSpan(s.track)[1] + 1)) },
					(_, i) => `Room ${"ABC"[i]}`,
				);
	return {
		id: doc._id.toString(),
		date: timestampToDate(doc.timestamp),
		rooms,
		afterHoursFrom: doc.afterHoursFrom || undefined,
		sessions,
	};
}

/**
 * Every day, in date order. A database failure returns null rather than
 * throwing, so the public page can fall back to "coming soon" instead of a 500.
 */
export async function loadSchedule(): Promise<ScheduleDay[] | null> {
	try {
		await connectMongoDB();
		const docs = (await Day.find({}).sort({ timestamp: 1 }).lean()) as unknown as DayDoc[];
		return docs.map(toScheduleDay);
	} catch (error) {
		console.error("Failed to load the schedule:", error instanceof Error ? error.message : error);
		return null;
	}
}
