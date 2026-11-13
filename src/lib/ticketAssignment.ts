/**
 * Assigning group-order tickets to delegates by hand.
 *
 * A group order (a head delegate buying for the whole delegation) carries
 * only the buyer's email, and Ticket Tailor can't give each ticket on one
 * order its own address. So nothing links those delegates automatically. The
 * buyer already has a list of who gets which ticket - name, email, ticket
 * code - and an admin pastes it into /admin/ticket-assignments. This module
 * reads that list and decides, line by line, what may be done. It is pure (no
 * database, no network) so every rule is unit-tested; the server side in
 * ticketAssignmentRun.ts loads the data and performs the links.
 */

export type AssignmentLine = {
	line: number;
	name: string;
	/** lowercased */
	email: string;
	code: string;
};

export type ParseProblem = { line: number; text: string; reason: "no-email" | "no-code" };

const EMAIL = /[^\s@<>,;:()"']+@[^\s@<>,;:()"']+\.[a-z]{2,}/i;
const SEPARATORS = /^[\s\-–—,;:|\t]+|[\s\-–—,;:|\t]+$/g;

/**
 * One delegate per line, written "Name - email - code" the way head
 * delegates send them. The separators are forgiving (dash, comma, tab, or
 * none at all), so a list pasted from a message or a spreadsheet both work.
 * The code is the first word after the email.
 */
export function parseAssignmentList(text: string): {
	lines: AssignmentLine[];
	problems: ParseProblem[];
} {
	const lines: AssignmentLine[] = [];
	const problems: ParseProblem[] = [];

	text.split(/\r?\n/).forEach((raw, i) => {
		const line = i + 1;
		const trimmed = raw.trim();
		if (!trimmed) return;

		const match = trimmed.match(EMAIL);
		if (!match || match.index === undefined) {
			problems.push({ line, text: trimmed, reason: "no-email" });
			return;
		}
		const code = trimmed.slice(match.index + match[0].length).match(/[A-Za-z0-9]+/)?.[0];
		if (!code) {
			problems.push({ line, text: trimmed, reason: "no-code" });
			return;
		}
		lines.push({
			line,
			name: trimmed.slice(0, match.index).replace(SEPARATORS, "").replace(/\s{2,}/g, " "),
			email: match[0].toLowerCase(),
			code,
		});
	});

	return { lines, problems };
}

export type TicketInfo = {
	id: string;
	barcode: string;
	orderId: string | null;
	ticketTypeId: string | null;
	description: string | null;
};

export type AccountInfo = {
	/** the account's sign-in email, as stored */
	email: string;
	linkedEmail: string | null;
	ticketId: string | null;
};

export type AssignmentData = {
	/** every valid admission on the event */
	tickets: TicketInfo[];
	/** accounts whose sign-in email is on the list */
	accounts: AccountInfo[];
	/** ticket id -> sign-in email of the account already holding it */
	ticketHolders: Map<string, string>;
	/**
	 * list emails (lowercased) already tied to some *other* account's ticket:
	 * another account's linked_email, or a linked registered-user row that
	 * holds this address as its student or personal email.
	 */
	emailsTakenElsewhere: Set<string>;
};

export type AssignmentStatus =
	/** will be linked to the ticket */
	| "ready"
	/** linked to this email already, the ticket id is added for the report */
	| "add-ticket-id"
	/** nothing to do */
	| "done"
	/** no account with this email yet; run the list again after they sign up */
	| "waiting"
	| "code-not-found"
	| "duplicate-code"
	| "duplicate-email"
	| "ticket-taken"
	| "account-has-other-ticket"
	| "email-taken";

export type PlannedLine = AssignmentLine & {
	status: AssignmentStatus;
	ticket?: TicketInfo;
	/** for code-not-found: the closest real code, when one is a likely typo */
	suggestion?: string;
	/** the account's sign-in email, when there is one */
	accountEmail?: string;
};

export const ACTIONABLE: ReadonlySet<AssignmentStatus> = new Set(["ready", "add-ticket-id"]);

function editDistance(a: string, b: string): number {
	const row = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const above = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
			previous = above;
		}
	}
	return row[b.length];
}

/**
 * Decides what each line may do. Nothing here can move a ticket an account
 * already holds, or give an account a second ticket: those lines come back
 * flagged for a person to sort out, never acted on.
 */
export function planAssignments(lines: AssignmentLine[], data: AssignmentData): PlannedLine[] {
	const byCode = new Map(data.tickets.map((t) => [t.barcode, t]));
	const byAccount = new Map(data.accounts.map((a) => [a.email.toLowerCase(), a]));
	const seenCodes = new Set<string>();
	const seenEmails = new Set<string>();

	return lines.map((line): PlannedLine => {
		if (seenCodes.has(line.code)) return { ...line, status: "duplicate-code" };
		if (seenEmails.has(line.email)) return { ...line, status: "duplicate-email" };
		seenCodes.add(line.code);
		seenEmails.add(line.email);

		const ticket = byCode.get(line.code);
		if (!ticket) {
			// Codes mix letters and digits, so I/1 and O/0 typos are common.
			const close = data.tickets
				.map((t) => ({ code: t.barcode, d: editDistance(line.code, t.barcode) }))
				.filter((c) => c.d <= 1)
				.map((c) => c.code);
			return { ...line, status: "code-not-found", suggestion: close.length === 1 ? close[0] : undefined };
		}

		const account = byAccount.get(line.email);
		const holder = data.ticketHolders.get(ticket.id);

		if (holder && holder.toLowerCase() !== line.email) {
			return { ...line, status: "ticket-taken", ticket, accountEmail: account?.email };
		}

		if (account?.linkedEmail) {
			if (account.linkedEmail.toLowerCase() !== line.email) {
				return { ...line, status: "account-has-other-ticket", ticket, accountEmail: account.email };
			}
			if (account.ticketId === ticket.id) return { ...line, status: "done", ticket, accountEmail: account.email };
			if (account.ticketId) {
				return { ...line, status: "account-has-other-ticket", ticket, accountEmail: account.email };
			}
			return { ...line, status: "add-ticket-id", ticket, accountEmail: account.email };
		}

		if (data.emailsTakenElsewhere.has(line.email)) {
			return { ...line, status: "email-taken", ticket, accountEmail: account?.email };
		}
		if (!account) return { ...line, status: "waiting", ticket };
		return { ...line, status: "ready", ticket, accountEmail: account.email };
	});
}
