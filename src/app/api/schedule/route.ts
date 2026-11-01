import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectMongoDB from "@/lib/mongodb";
import { Day } from "@/lib/models";
import { logAdminAction } from "@/lib/adminAuditLogger";
import { clashes, parseSession, type Session } from "@/lib/schedule";
import { loadSchedule, toScheduleDay, toSession } from "@/lib/scheduleStore";
import { badRequest, requireScheduleAdmin } from "./adminGuard";

/*
 * Sessions on a day. Days themselves are created, renamed and removed through
 * /api/schedule/days. Every write is admin-only and audit-logged; the rules
 * for a valid session live in src/lib/schedule.ts, shared with the editor.
 */

export async function GET() {
	const days = await loadSchedule();
	if (!days) return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	return NextResponse.json(days);
}

/** The stored fields for a validated session. */
function toItemFields(session: Omit<Session, "id">) {
	return {
		startTime: session.start,
		endTime: session.end,
		title: session.title,
		titleFr: session.titleFr,
		description: session.description,
		descriptionFr: session.descriptionFr,
		location: session.location,
		track: session.track,
		category: session.category,
		photo: session.photo,
		afterHours: session.afterHours,
	};
}

type Body = { dayId?: unknown; sessionId?: unknown; session?: unknown };

/** Loads the day and validates the incoming session against it. */
async function prepare(body: Body, sessionId?: string) {
	if (typeof body.dayId !== "string" || !mongoose.isValidObjectId(body.dayId)) {
		return { error: badRequest("Missing or invalid dayId") };
	}
	await connectMongoDB();
	const day = await Day.findById(body.dayId);
	if (!day) return { error: badRequest("Day not found", 404) };

	const current = toScheduleDay(day.toObject());
	const parsed = parseSession(body.session, current.rooms.length);
	if (!parsed.ok) return { error: badRequest(parsed.error) };

	const candidate = { ...parsed.value, id: sessionId ?? "new" };
	const clash = current.sessions.find((s) => s.id !== sessionId && clashes(s, candidate));
	if (clash) {
		return {
			error: badRequest(`That overlaps "${clash.title}" (${clash.start} - ${clash.end}) in the same room.`, 409),
		};
	}
	return { day, value: parsed.value };
}

export async function POST(request: Request) {
	try {
		const admin = await requireScheduleAdmin();
		if (admin.denied) return admin.denied;

		const body = (await request.json()) as Body;
		const prepared = await prepare(body);
		if (prepared.error) return prepared.error;
		const { day, value } = prepared;

		day.schedule.push(toItemFields(value));
		await day.save();

		await logAdminAction({
			adminEmail: admin.email,
			action: "CREATE_SCHEDULE_EVENT",
			resourceType: "scheduleItem",
			resourceId: day._id.toString(),
			details: { eventTitle: value.title, dayDate: day.date, startTime: value.start, endTime: value.end },
			newData: toItemFields(value),
			request,
		});

		return NextResponse.json({ day: toScheduleDay(day.toObject()) }, { status: 201 });
	} catch (error) {
		console.error("Error adding schedule session:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const admin = await requireScheduleAdmin();
		if (admin.denied) return admin.denied;

		const body = (await request.json()) as Body;
		if (typeof body.sessionId !== "string") return badRequest("Missing sessionId");
		const prepared = await prepare(body, body.sessionId);
		if (prepared.error) return prepared.error;
		const { day, value } = prepared;

		const item = day.schedule.id(body.sessionId);
		if (!item) return badRequest("Session not found", 404);
		const previous = toSession(item.toObject());

		item.set(toItemFields(value));
		await day.save();

		await logAdminAction({
			adminEmail: admin.email,
			action: "UPDATE_SCHEDULE_EVENT",
			resourceType: "scheduleItem",
			resourceId: day._id.toString(),
			details: { eventTitle: value.title, dayDate: day.date, eventId: body.sessionId },
			previousData: previous,
			newData: toItemFields(value),
			request,
		});

		return NextResponse.json({ day: toScheduleDay(day.toObject()) });
	} catch (error) {
		console.error("Error updating schedule session:", error instanceof Error ? error.message : error);
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
		if (typeof body.sessionId !== "string") return badRequest("Missing sessionId");

		await connectMongoDB();
		const day = await Day.findById(body.dayId);
		if (!day) return badRequest("Day not found", 404);
		const item = day.schedule.id(body.sessionId);
		if (!item) return badRequest("Session not found", 404);
		const previous = toSession(item.toObject());

		item.deleteOne();
		await day.save();

		await logAdminAction({
			adminEmail: admin.email,
			action: "DELETE_SCHEDULE_EVENT",
			resourceType: "scheduleItem",
			resourceId: day._id.toString(),
			details: { eventTitle: previous.title, dayDate: day.date, eventId: body.sessionId },
			previousData: previous,
			request,
		});

		return NextResponse.json({ day: toScheduleDay(day.toObject()) });
	} catch (error) {
		console.error("Error deleting schedule session:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
