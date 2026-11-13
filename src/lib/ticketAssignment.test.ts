import { describe, expect, it } from "vitest";
import {
	parseAssignmentList,
	planAssignments,
	type AssignmentData,
	type AssignmentLine,
	type TicketInfo,
} from "./ticketAssignment";

describe("parseAssignmentList", () => {
	it("reads the head delegate's 'Name - email - code' lines, however they're spaced", () => {
		const { lines, problems } = parseAssignmentList(
			[
				"Sam Laquerre  - samuel.laquerre@ucalgary.ca - Ek59veA",
				"Etienne Knowlton -    etienne.knowlton@ucalgary.ca - xT59L35",
				"Muhammad Haseeb Tahir - muhammad.tahir1@ucalgary.ca nw6WNaj",
				"Cody Diao - Changjiang.diao@ucalgary.ca - rZ6jDWb",
				"",
				"Jiwan (Ben) Kim\tjiwan.kim@ucalgary.ca\tUP6kEqF",
			].join("\n"),
		);
		expect(problems).toEqual([]);
		expect(lines.map((l) => [l.name, l.email, l.code])).toEqual([
			["Sam Laquerre", "samuel.laquerre@ucalgary.ca", "Ek59veA"],
			["Etienne Knowlton", "etienne.knowlton@ucalgary.ca", "xT59L35"],
			["Muhammad Haseeb Tahir", "muhammad.tahir1@ucalgary.ca", "nw6WNaj"],
			["Cody Diao", "changjiang.diao@ucalgary.ca", "rZ6jDWb"],
			["Jiwan (Ben) Kim", "jiwan.kim@ucalgary.ca", "UP6kEqF"],
		]);
		expect(lines[4].line).toBe(6);
	});

	it("reports lines it can't read rather than guessing", () => {
		const { problems } = parseAssignmentList("Just a name\nSomeone - a@b.ca -");
		expect(problems.map((p) => p.reason)).toEqual(["no-email", "no-code"]);
	});
});

const ticket = (barcode: string, id = `it_${barcode}`): TicketInfo => ({
	id,
	barcode,
	orderId: "or_1",
	ticketTypeId: "tt_1",
	description: "HD Delegate Admission Ticket",
});

const line = (email: string, code: string, n = 1): AssignmentLine => ({ line: n, name: "N", email, code });

const data = (over: Partial<AssignmentData> = {}): AssignmentData => ({
	tickets: [ticket("Ek59veA"), ticket("SW1jHED"), ticket("xT59L35")],
	accounts: [],
	ticketHolders: new Map(),
	emailsTakenElsewhere: new Set(),
	...over,
});

describe("planAssignments", () => {
	it("is ready when the account exists and nothing is linked", () => {
		const [p] = planAssignments(
			[line("sam@x.ca", "Ek59veA")],
			data({ accounts: [{ email: "Sam@x.ca", linkedEmail: null, ticketId: null }] }),
		);
		expect(p).toMatchObject({ status: "ready", accountEmail: "Sam@x.ca", ticket: { id: "it_Ek59veA" } });
	});

	it("waits when the delegate hasn't signed up yet", () => {
		expect(planAssignments([line("sam@x.ca", "Ek59veA")], data())[0].status).toBe("waiting");
	});

	it("suggests the real code for a one-character typo", () => {
		const [p] = planAssignments([line("rob@x.ca", "SWIjHED")], data());
		expect(p).toMatchObject({ status: "code-not-found", suggestion: "SW1jHED" });
	});

	it("never moves a ticket another account holds", () => {
		const [p] = planAssignments(
			[line("sam@x.ca", "Ek59veA")],
			data({
				accounts: [{ email: "sam@x.ca", linkedEmail: null, ticketId: null }],
				ticketHolders: new Map([["it_Ek59veA", "someone@else.ca"]]),
			}),
		);
		expect(p.status).toBe("ticket-taken");
	});

	it("never gives an account a second ticket", () => {
		const [p] = planAssignments(
			[line("sam@x.ca", "Ek59veA")],
			data({ accounts: [{ email: "sam@x.ca", linkedEmail: "personal@x.ca", ticketId: "it_other" }] }),
		);
		expect(p.status).toBe("account-has-other-ticket");
	});

	it("flags an email already tied to another account's ticket", () => {
		const [p] = planAssignments(
			[line("cody@x.ca", "Ek59veA")],
			data({ emailsTakenElsewhere: new Set(["cody@x.ca"]) }),
		);
		expect(p.status).toBe("email-taken");
	});

	it("adds the ticket id to an account already linked to this email, and is done after", () => {
		const accounts = [{ email: "sam@x.ca", linkedEmail: "sam@x.ca", ticketId: null }];
		expect(planAssignments([line("sam@x.ca", "Ek59veA")], data({ accounts }))[0].status).toBe("add-ticket-id");
		accounts[0].ticketId = "it_Ek59veA" as never;
		expect(planAssignments([line("sam@x.ca", "Ek59veA")], data({ accounts }))[0].status).toBe("done");
	});

	it("treats the ticket being held by this same delegate as fine", () => {
		const [p] = planAssignments(
			[line("sam@x.ca", "Ek59veA")],
			data({
				accounts: [{ email: "sam@x.ca", linkedEmail: "sam@x.ca", ticketId: "it_Ek59veA" }],
				ticketHolders: new Map([["it_Ek59veA", "sam@x.ca"]]),
			}),
		);
		expect(p.status).toBe("done");
	});

	it("only acts on the first of a repeated code or email", () => {
		const plan = planAssignments(
			[line("a@x.ca", "Ek59veA", 1), line("b@x.ca", "Ek59veA", 2), line("a@x.ca", "xT59L35", 3)],
			data(),
		);
		expect(plan.map((p) => p.status)).toEqual(["waiting", "duplicate-code", "duplicate-email"]);
	});
});
