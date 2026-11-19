import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), distinct: vi.fn(), index: vi.fn() }));
vi.mock("../mongodb", () => ({ default: vi.fn() }));
vi.mock("node:crypto", () => ({ randomInt: () => 0 }));
vi.mock("../models", () => ({ User: {
  findById: (...args: unknown[]) => ({ select: () => ({ lean: () => m.read(...args) }) }),
  findOneAndUpdate: (...args: unknown[]) => ({ select: () => ({ lean: () => m.update(...args) }) }),
  distinct: m.distinct, collection: { createIndex: m.index },
} }));
import { ensureTicketGraphicNumber, toTicketRomanNumeral } from "../ticketGraphicNumber";

beforeEach(() => {
  vi.resetAllMocks();
  m.read.mockResolvedValue({});
  m.distinct.mockResolvedValue([]);
  m.update.mockImplementation(async (_query, change) => change.$set);
});

describe("ticket graphic numerals", () => {
  it.each([[10, "X"], [49, "XLIX"], [944, "CMXLIV"], [1488, "MCDLXXXVIII"], [1500, "MD"]])("formats %i as %s", (value, roman) => {
    expect(toTicketRomanNumeral(value as number)).toBe(roman);
  });
  it("has exactly 1491 different representations within the inclusive range", () => {
    const numerals = Array.from({ length: 1491 }, (_, i) => toTicketRomanNumeral(i + 10));
    expect(new Set(numerals).size).toBe(1491);
  });
  it.each([9, 1501, 10.5, NaN])("rejects invalid display numbers: %s", value => {
    expect(() => toTicketRomanNumeral(value)).toThrow(RangeError);
  });
  it("keeps an existing number without allocating or writing again", async () => {
    m.read.mockResolvedValue({ ticketGraphicNumber: 1500 });
    expect(await ensureTicketGraphicNumber("self")).toBe(1500);
    expect(m.update).not.toHaveBeenCalled();
    expect(m.index).not.toHaveBeenCalled();
  });
  it("skips used numbers and scopes assignment to this unassigned account", async () => {
    m.distinct.mockResolvedValue([10, 11]);
    expect(await ensureTicketGraphicNumber("self")).toBe(12);
    expect(m.update).toHaveBeenCalledWith(
      { _id: "self", ticketGraphicNumber: { $exists: false } },
      { $set: { ticketGraphicNumber: 12 } }, { new: true, runValidators: true },
    );
    expect(m.index.mock.invocationCallOrder[0]).toBeLessThan(m.update.mock.invocationCallOrder[0]);
  });
  it("retries a concurrent collision instead of issuing duplicate numbers", async () => {
    m.update.mockRejectedValueOnce({ code: 11000, keyPattern: { ticketGraphicNumber: 1 } });
    expect(await ensureTicketGraphicNumber("self")).toBe(11);
  });
  it("returns the winning number when the same account races itself", async () => {
    m.update.mockResolvedValue(null);
    m.read.mockResolvedValueOnce({}).mockResolvedValue({ ticketGraphicNumber: 123 });
    expect(await ensureTicketGraphicNumber("self")).toBe(123);
  });
  it("does not issue duplicates when different accounts race for a candidate", async () => {
    const assigned = new Map<string, number>();
    m.read.mockImplementation(async id => assigned.has(id) ? { ticketGraphicNumber: assigned.get(id) } : {});
    m.update.mockImplementation(async (query, change) => {
      if (assigned.has(query._id)) return null;
      if ([...assigned.values()].includes(change.$set.ticketGraphicNumber)) throw { code: 11000, keyPattern: { ticketGraphicNumber: 1 } };
      assigned.set(query._id, change.$set.ticketGraphicNumber);
      return change.$set;
    });
    const values = await Promise.all([ensureTicketGraphicNumber("one"), ensureTicketGraphicNumber("two"), ensureTicketGraphicNumber("one")]);
    expect(values[0]).toBe(values[2]);
    expect(values[0]).not.toBe(values[1]);
  });
  it("leaves an exhausted pool unassigned rather than reusing a number", async () => {
    m.distinct.mockResolvedValue(Array.from({ length: 1491 }, (_, i) => i + 10));
    expect(await ensureTicketGraphicNumber("self")).toBeNull();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("does not allocate if the unique index cannot be created", async () => {
    m.index.mockRejectedValue(new Error("index unavailable"));
    await expect(ensureTicketGraphicNumber("self")).rejects.toThrow("index unavailable");
    expect(m.update).not.toHaveBeenCalled();
  });
  it("does not swallow unrelated database errors", async () => {
    m.update.mockRejectedValue({ code: 11000, keyPattern: { linked_email: 1 } });
    await expect(ensureTicketGraphicNumber("self")).rejects.toMatchObject({ keyPattern: { linked_email: 1 } });
  });
});
