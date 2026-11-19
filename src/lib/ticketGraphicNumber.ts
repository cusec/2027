import { randomInt } from "node:crypto";
import connectMongoDB from "./mongodb";
import { User } from "./models";

export const MIN_TICKET_GRAPHIC_NUMBER = 10;
export const MAX_TICKET_GRAPHIC_NUMBER = 1500;
type TicketGraphicAccount = { ticketGraphicNumber?: number };

export function toTicketRomanNumeral(value: number): string {
  if (!Number.isInteger(value) || value < MIN_TICKET_GRAPHIC_NUMBER || value > MAX_TICKET_GRAPHIC_NUMBER) {
    throw new RangeError("Ticket graphic numbers must be integers from 10 to 1500");
  }
  let remaining = value;
  let roman = "";
  for (const [amount, symbol] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const) {
    while (remaining >= amount) { roman += symbol; remaining -= amount; }
  }
  return roman;
}

/** A stable display number, unrelated to admission, VIP status or Ticket Tailor IDs. */
export async function ensureTicketGraphicNumber(userId: string): Promise<number | null> {
  await connectMongoDB();
  const read = () => User.findById(userId).select("ticketGraphicNumber").lean<TicketGraphicAccount | null>();
  const user = await read();
  if (!user) throw new Error("Ticket graphic account not found");
  if (user.ticketGraphicNumber !== undefined) return user.ticketGraphicNumber;

  // Wait for database-enforced uniqueness before assigning anything. Legacy
  // accounts without this optional field do not participate in the index.
  await User.collection.createIndex({ ticketGraphicNumber: 1 }, {
    name: "unique_ticket_graphic_number", unique: true,
    partialFilterExpression: { ticketGraphicNumber: { $type: "number" } },
  });
  const used = new Set(await User.distinct("ticketGraphicNumber"));
  const available = Array.from({ length: MAX_TICKET_GRAPHIC_NUMBER - MIN_TICKET_GRAPHIC_NUMBER + 1 }, (_, i) => i + MIN_TICKET_GRAPHIC_NUMBER).filter(value => !used.has(value));
  while (available.length) {
    const [number] = available.splice(randomInt(available.length), 1);
    try {
      const assigned = await User.findOneAndUpdate(
        { _id: userId, ticketGraphicNumber: { $exists: false } },
        { $set: { ticketGraphicNumber: number } },
        { new: true, runValidators: true },
      ).select("ticketGraphicNumber").lean<TicketGraphicAccount | null>();
      if (assigned?.ticketGraphicNumber !== undefined) return assigned.ticketGraphicNumber;
      // Another request for this same account may already have assigned it.
      const current = await read();
      if (current?.ticketGraphicNumber !== undefined) return current.ticketGraphicNumber;
      throw new Error("Ticket graphic account no longer exists");
    } catch (error) {
      const duplicate = error as { code?: number; keyPattern?: { ticketGraphicNumber?: number } };
      if (duplicate.code !== 11000 || duplicate.keyPattern?.ticketGraphicNumber !== 1) throw error;
      // A different attendee claimed this candidate concurrently; try another.
    }
  }
  // Never reuse a number or block access to the profile when all 1491 are taken.
  const current = await read();
  return current?.ticketGraphicNumber ?? null;
}
