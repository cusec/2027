import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import isAdmin from "@/lib/isAdmin";
import { applyAssignments, previewAssignments } from "@/lib/ticketAssignmentRun";

/*
 * POST { text, apply } - the group-ticket assignment tool on
 * /admin/ticket-assignments. `apply: false` (the default) only previews;
 * `apply: true` re-plans from fresh data and links the "ready" lines.
 * Admin-only. The list carries delegates' emails, so nothing here is logged
 * beyond the error message.
 */

const MAX_TEXT = 20_000;

export async function POST(request: Request) {
	if (!(await isAdmin())) {
		return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
	}

	let body: { text?: unknown; apply?: unknown };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
	if (!text.trim()) return NextResponse.json({ error: "Paste the list first" }, { status: 400 });

	try {
		if (body.apply === true) {
			const session = await auth0.getSession();
			const result = await applyAssignments(text, session?.user?.email || "unknown", request);
			return NextResponse.json(result, { status: result.ok ? 200 : 502 });
		}
		const result = await previewAssignments(text);
		return NextResponse.json(result, { status: result.ok ? 200 : 502 });
	} catch (error) {
		console.error("Ticket assignment failed:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
