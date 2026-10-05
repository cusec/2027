import { auth0 } from "@/lib/auth0";
import isAdmin from "@/lib/isAdmin";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo, User } from "@/lib/models";
import { findTicketByEmail, listIssuedAdmissions } from "@/lib/ticketTailor";
import {
	buildParticipantRows,
	reportCsv,
	workingCsv,
	type ReportAccount,
} from "@/lib/participantReport";

// GET ?view=report   the MTL Business Events participant report, five
//                    contract columns, no names or emails - this is the file
//                    to submit.
// GET ?view=working  the team's copy: every ticket, its account, what is
//                    missing and whether it is over the 100 km line.
//
// Admin only. Read-only towards delegates with one exception: an account that
// was linked before ticket ids were recorded gets its Ticket Tailor order (and,
// where it can be told, its own ticket) looked up once and stored in
// ticketWizard.purchasedOrderId / purchasedTicketId. Those are additive fields
// nothing else reads, so nothing about the account changes. Test tickets are
// left out of both files (isTestTicket).

const BACKFILL_CONCURRENCY = 6;

type LinkedUser = {
	_id: unknown;
	linked_email?: string;
	ticketWizard?: { purchasedOrderId?: string | null; purchasedTicketId?: string | null };
};

type Location = { travelCountry?: string; travelRegion?: string; travelCity?: string; postalCode?: string };

async function backfillOrderIds(users: LinkedUser[]) {
	const pending = users.filter((u) => !u.ticketWizard?.purchasedOrderId && u.linked_email);
	for (let i = 0; i < pending.length; i += BACKFILL_CONCURRENCY) {
		await Promise.all(
			pending.slice(i, i + BACKFILL_CONCURRENCY).map(async (user) => {
				const ticket = await findTicketByEmail(user.linked_email!);
				if (!ticket?.orderId) return;
				const ticketId = ticket.ticketId ?? null;
				await User.updateOne(
					{ _id: user._id },
					{
						$set: {
							"ticketWizard.purchasedOrderId": ticket.orderId,
							"ticketWizard.purchasedTicketId": ticketId,
						},
					},
				);
				user.ticketWizard = { ...user.ticketWizard, purchasedOrderId: ticket.orderId, purchasedTicketId: ticketId };
			}),
		);
	}
}

export async function GET(request: Request) {
	if (!(await auth0.getSession()) || !(await isAdmin())) {
		return new Response("Unauthorized", { status: 401 });
	}

	const view = new URL(request.url).searchParams.get("view") === "working" ? "working" : "report";

	try {
		const admissions = await listIssuedAdmissions();
		if (!admissions) {
			return new Response("Ticket Tailor is unavailable, so the report can't be built right now.", {
				status: 503,
			});
		}

		await connectMongoDB();
		const users = await User.find({ linked_email: { $nin: [null, ""] } })
			.select("_id linked_email ticketWizard.purchasedOrderId ticketWizard.purchasedTicketId")
			.lean<LinkedUser[]>();
		await backfillOrderIds(users);

		const withOrder = users.filter((u) => u.ticketWizard?.purchasedOrderId);
		const profiles = await DemographicInfo.find({ user: { $in: withOrder.map((u) => u._id) } })
			.select("user travelCountry travelRegion travelCity postalCode")
			.lean<(Location & { user: unknown })[]>();
		const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

		const accounts: ReportAccount[] = withOrder.map((u) => ({
			orderId: u.ticketWizard!.purchasedOrderId!,
			ticketId: u.ticketWizard?.purchasedTicketId ?? null,
			email: u.linked_email ?? "",
			location: profileByUser.get(String(u._id)) ?? null,
		}));

		const rows = buildParticipantRows(admissions, accounts);
		const body = view === "working" ? workingCsv(rows) : reportCsv(rows);
		const stamp = new Date().toISOString().slice(0, 10);

		return new Response(body, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="cusec-2027-${view === "working" ? "participant-working-sheet" : "mtl-participant-report"}-${stamp}.csv"`,
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		// The error only - never the rows, which carry delegates' locations.
		console.error("Participant report failed:", error instanceof Error ? error.message : error);
		return new Response("Report unavailable", { status: 500 });
	}
}
