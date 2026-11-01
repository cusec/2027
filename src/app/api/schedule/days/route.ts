import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectMongoDB from "@/lib/mongodb";
import { Day } from "@/lib/models";
import { logAdminAction } from "@/lib/adminAuditLogger";
import { dateToTimestamp, parseDay, trackSpan } from "@/lib/schedule";
import { toScheduleDay } from "@/lib/scheduleStore";
import { badRequest, requireScheduleAdmin } from "../adminGuard";

/*
 * Conference days: create, rename rooms / move the date, delete. Sessions on
 * a day go through /api/schedule. Admin-only and audit-logged.
 */

/** The 2026 display strings, "Thursday" and "January 7th", kept for old readers. */
function displayFields(date: string) {
	const at = new Date(`${date}T12:00:00Z`);
	const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(at);
	const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(at);
	const n = at.getUTCDate();
	const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
	return { day, date: `${month} ${n}${suffix}` };
}

type Body = { dayId?: unknown; day?: unknown };

export async function POST(request: Request) {
	try {
		const admin = await requireScheduleAdmin();
		if (admin.denied) return admin.denied;

		const body = (await request.json()) as Body;
		const parsed = parseDay(body.day);
		if (!parsed.ok) return badRequest(parsed.error);
		const { date, rooms, afterHoursFrom } = parsed.value;

		await connectMongoDB();
		const timestamp = dateToTimestamp(date);
		if (await Day.exists({ timestamp })) return badRequest("That date already has a day", 409);

		const day = await Day.create({ ...displayFields(date), timestamp, rooms, afterHoursFrom, schedule: [] });

		await logAdminAction({
			adminEmail: admin.email,
			action: "CREATE_SCHEDULE_DAY",
			resourceType: "scheduleItem",
			resourceId: day._id.toString(),
			details: { dayDate: date },
			newData: { date, rooms, afterHoursFrom },
			request,
		});

		return NextResponse.json({ day: toScheduleDay(day.toObject()) }, { status: 201 });
	} catch (error) {
		console.error("Error creating schedule day:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const admin = await requireScheduleAdmin();
		if (admin.denied) return admin.denied;

		const body = (await request.json()) as Body;
		if (typeof body.dayId !== "string" || !mongoose.isValidObjectId(body.dayId)) {
			return badRequest("Missing or invalid dayId");
		}
		const parsed = parseDay(body.day);
		if (!parsed.ok) return badRequest(parsed.error);
		const { date, rooms, afterHoursFrom } = parsed.value;

		await connectMongoDB();
		const day = await Day.findById(body.dayId);
		if (!day) return badRequest("Day not found", 404);

		const timestamp = dateToTimestamp(date);
		if (await Day.exists({ timestamp, _id: { $ne: day._id } })) {
			return badRequest("That date already has a day", 409);
		}

		// Dropping a room would strand the sessions in it.
		const current = toScheduleDay(day.toObject());
		const stranded = current.sessions.find((s) => !s.afterHours && trackSpan(s.track)[1] >= rooms.length);
		if (stranded) {
			return badRequest(`Move or delete "${stranded.title}" first: it uses a room you're removing.`, 409);
		}

		const previous = { date: current.date, rooms: current.rooms, afterHoursFrom: current.afterHoursFrom };
		day.set({ ...displayFields(date), timestamp, rooms, afterHoursFrom });
		await day.save();

		await logAdminAction({
			adminEmail: admin.email,
			action: "UPDATE_SCHEDULE_DAY",
			resourceType: "scheduleItem",
			resourceId: day._id.toString(),
			details: { dayDate: date },
			previousData: previous,
			newData: { date, rooms, afterHoursFrom },
			request,
		});

		return NextResponse.json({ day: toScheduleDay(day.toObject()) });
	} catch (error) {
		console.error("Error updating schedule day:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const admin = await requireScheduleAdmin();
		if (admin.denied) return admin.denied;

		const body = (await request.json()) as Body;
		if (typeof body.dayId !== "string" || !mongoose.isValidObjectId(body.dayId)) {
			return badRequest("Missing or invalid dayId");
		}

		await connectMongoDB();
		const day = await Day.findById(body.dayId);
		if (!day) return badRequest("Day not found", 404);
		const previous = toScheduleDay(day.toObject());

		await day.deleteOne();

		await logAdminAction({
			adminEmail: admin.email,
			action: "DELETE_SCHEDULE_DAY",
			resourceType: "scheduleItem",
			resourceId: previous.id,
			details: { dayDate: previous.date, sessions: previous.sessions.length },
			previousData: previous,
			request,
		});

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Error deleting schedule day:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
