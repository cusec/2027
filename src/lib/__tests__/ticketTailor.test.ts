import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractPurchasedTicket, findIssuedAdmissionByEmail } from "../ticketTailor";

const SERIES = "es_2415502";

const ticket = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	status: "valid",
	add_on_id: null,
	event_series_id: SERIES,
	order_id: "or_9",
	ticket_type_id: "tt_1",
	description: "HD Delegate",
	...extra,
});

describe("extractPurchasedTicket", () => {
	it("records the order, and the ticket when the order has exactly one", () => {
		const one = extractPurchasedTicket({
			id: "or_1",
			line_items: [{ item_id: "tt_1", description: "Student" }],
			issued_tickets: [ticket("it_1"), ticket("it_2", { add_on_id: "ao_1" })],
		});
		expect(one).toMatchObject({ orderId: "or_1", ticketId: "it_1", ticketTypeId: "tt_1" });
	});

	it("leaves the ticket ambiguous on a group order", () => {
		const group = extractPurchasedTicket({
			id: "or_2",
			line_items: [{ item_id: "tt_1", description: "HD" }],
			issued_tickets: [ticket("it_1"), ticket("it_2")],
		});
		expect(group).toMatchObject({ orderId: "or_2", ticketId: null });
	});
});

describe("findIssuedAdmissionByEmail", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubEnv("TICKET_TAILOR_API_KEY", "sk_test");
		vi.stubEnv("TICKET_TAILOR_EVENT_ID", "2415502");
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		fetchMock.mockReset();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	const respond = (data: unknown[]) =>
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data }) });

	it("never asks Ticket Tailor about a malformed address (the filter would be dropped)", async () => {
		expect(await findIssuedAdmissionByEmail("not-an-email")).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns the delegate's own ticket when exactly one admission matches", async () => {
		respond([ticket("it_7"), ticket("it_8", { add_on_id: "ao_1" })]);
		expect(await findIssuedAdmissionByEmail("Delegate@Example.com")).toEqual({
			ticketTypeId: "tt_1",
			name: "HD Delegate",
			orderId: "or_9",
			ticketId: "it_7",
		});
		expect(String(fetchMock.mock.calls[0][0])).toContain("email=delegate%40example.com");
	});

	it("treats more than one admission as no match", async () => {
		respond([ticket("it_7"), ticket("it_9")]);
		expect(await findIssuedAdmissionByEmail("delegate@example.com")).toBeNull();
	});

	it("ignores voided tickets and other events", async () => {
		respond([ticket("it_7", { status: "voided" }), ticket("it_8", { event_series_id: "es_1" })]);
		expect(await findIssuedAdmissionByEmail("delegate@example.com")).toBeNull();
	});
});
