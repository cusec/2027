// Server-only: imports Mongoose. The rules live in ./ticketAssignment.
import connectMongoDB from "./mongodb";
import { RegisteredUser, User } from "./models";
import { listIssuedAdmissions } from "./ticketTailor";
import { linkTicketPurchase } from "./ticketLinking";
import { logAdminAction } from "./adminAuditLogger";
import {
	ACTIONABLE,
	parseAssignmentList,
	planAssignments,
	type AssignmentData,
	type AssignmentLine,
	type ParseProblem,
	type PlannedLine,
	type TicketInfo,
} from "./ticketAssignment";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactly = (email: string) => new RegExp(`^${escape(email)}$`, "i");

type LeanUser = {
	_id: unknown;
	email: string;
	linked_email?: string | null;
	ticketWizard?: { purchasedTicketId?: string | null };
};
type LeanRegistered = {
	linkedEmail: string;
	studentEmail?: string;
	personalEmail?: string;
	isLinked?: boolean;
};

/** Everything the plan needs, read fresh from Ticket Tailor and the database. */
async function loadData(lines: AssignmentLine[]): Promise<AssignmentData | null> {
	const admissions = await listIssuedAdmissions();
	if (!admissions) return null;
	const tickets: TicketInfo[] = admissions.flatMap((a) =>
		a.barcode ? [{ ...a, barcode: a.barcode }] : [],
	);

	await connectMongoDB();
	const patterns = lines.map((l) => exactly(l.email));
	const listed = new Set(lines.map((l) => l.email));

	const [accounts, holders, linkedHere, registered] = await Promise.all([
		patterns.length ? User.find({ email: { $in: patterns } }).lean<LeanUser[]>() : [],
		User.find({ "ticketWizard.purchasedTicketId": { $in: tickets.map((t) => t.id) } })
			.select("email ticketWizard.purchasedTicketId")
			.lean<LeanUser[]>(),
		patterns.length ? User.find({ linked_email: { $in: patterns } }).select("email linked_email").lean<LeanUser[]>() : [],
		patterns.length
			? RegisteredUser.find({
					isLinked: true,
					$or: [
						{ linkedEmail: { $in: patterns } },
						{ studentEmail: { $in: patterns } },
						{ personalEmail: { $in: patterns } },
					],
				}).lean<LeanRegistered[]>()
			: [],
	]);

	// An address counts as taken when another account owns it: either as that
	// account's linked_email, or through a linked ticket row that lists it as
	// a student/personal address (an account linked through another email).
	const emailsTakenElsewhere = new Set<string>();
	for (const u of linkedHere) {
		const linked = (u.linked_email ?? "").toLowerCase();
		if (listed.has(linked) && u.email.toLowerCase() !== linked) emailsTakenElsewhere.add(linked);
	}
	for (const r of registered) {
		const own = r.linkedEmail.toLowerCase();
		for (const other of [r.studentEmail, r.personalEmail]) {
			const address = (other ?? "").toLowerCase();
			if (address && address !== own && listed.has(address)) emailsTakenElsewhere.add(address);
		}
	}

	return {
		tickets,
		accounts: accounts.map((a) => ({
			email: a.email,
			linkedEmail: a.linked_email ?? null,
			ticketId: a.ticketWizard?.purchasedTicketId ?? null,
		})),
		ticketHolders: new Map(
			holders.flatMap((h) =>
				h.ticketWizard?.purchasedTicketId ? [[h.ticketWizard.purchasedTicketId, h.email] as const] : [],
			),
		),
		emailsTakenElsewhere,
	};
}

export type AssignmentPreview =
	| { ok: true; plan: PlannedLine[]; problems: ParseProblem[]; ticketCount: number }
	| { ok: false; error: "ticket-tailor-unavailable" };

export async function previewAssignments(text: string): Promise<AssignmentPreview> {
	const { lines, problems } = parseAssignmentList(text);
	const data = await loadData(lines);
	if (!data) return { ok: false, error: "ticket-tailor-unavailable" };
	return { ok: true, plan: planAssignments(lines, data), problems, ticketCount: data.tickets.length };
}

export type AppliedLine = PlannedLine & { outcome: "linked" | "ticket-id-added" | "failed" | "skipped" };

/**
 * Re-plans from fresh data immediately before writing, so a preview that went
 * stale (someone signed up, or got linked) can't cause a wrong link. Only
 * "ready" and "add-ticket-id" lines are touched; every write is audit-logged.
 */
export async function applyAssignments(
	text: string,
	adminEmail: string,
	request?: Request,
): Promise<
	| { ok: true; results: AppliedLine[]; problems: ParseProblem[] }
	| { ok: false; error: "ticket-tailor-unavailable" }
> {
	const preview = await previewAssignments(text);
	if (!preview.ok) return preview;

	const results: AppliedLine[] = [];
	for (const planned of preview.plan) {
		if (!ACTIONABLE.has(planned.status) || !planned.ticket || !planned.accountEmail) {
			results.push({ ...planned, outcome: "skipped" });
			continue;
		}
		const { ticket, accountEmail } = planned;

		if (planned.status === "add-ticket-id") {
			// Already linked to this email (e.g. by hand), only missing the ids
			// the MTL report joins on. Guarded so it can never overwrite one.
			const update = await User.updateOne(
				{ email: accountEmail, "ticketWizard.purchasedTicketId": { $in: [null, ""] } },
				{
					$set: {
						"ticketWizard.purchasedTicketId": ticket.id,
						"ticketWizard.purchasedOrderId": ticket.orderId,
						"ticketWizard.purchasedTicketTypeId": ticket.ticketTypeId,
						"ticketWizard.purchasedTicketName": ticket.description,
					},
				},
			);
			const outcome = update.modifiedCount === 1 ? "ticket-id-added" : "failed";
			results.push({ ...planned, outcome });
			if (outcome === "failed") continue;
		} else {
			// The ticket row for this email, when one exists, keeps its stored
			// spelling so linkTicketPurchase reuses it instead of adding another.
			const row = await RegisteredUser.findOne({ linkedEmail: exactly(planned.email) })
				.select("linkedEmail")
				.lean<{ linkedEmail: string }>();
			const result = await linkTicketPurchase(
				row?.linkedEmail ?? planned.email,
				planned.name || "Attendee",
				{
					ticketTypeId: ticket.ticketTypeId,
					name: ticket.description,
					orderId: ticket.orderId,
					ticketId: ticket.id,
				},
				accountEmail,
				"admin",
			);
			results.push({ ...planned, outcome: result.linked ? "linked" : "failed" });
			if (!result.linked) continue;
		}

		await logAdminAction({
			adminEmail,
			action: "ASSIGN_GROUP_TICKET",
			resourceType: "user",
			targetUserEmail: accountEmail,
			resourceId: ticket.id,
			details: { ticketId: ticket.id, orderId: ticket.orderId, mode: planned.status },
			request,
		});
	}

	return { ok: true, results, problems: preview.problems };
}
