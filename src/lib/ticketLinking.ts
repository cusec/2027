import connectMongoDB from "./mongodb";
import { RegisteredUser, User, DemographicInfo } from "./models";
import { findCompletedOrderByEmail, type PurchasedTicket } from "./ticketTailor";

export interface LinkResult {
  linked: boolean;
  purchasedTicketName: string | null;
}

// Single implementation of "this email bought a ticket -> reflect that in the
// database", shared by the order.created webhook and the API reconciliation
// path so the two can't drift apart.
//
// Safety rules (mirroring /api/users/link-email):
//   - RegisteredUser is upserted for the buyer either way (the allowlist the
//     manual link-email flow checks against).
//   - A User is only auto-linked when it has no linked_email yet AND no other
//     User already claims that address.
//   - An already-linked RegisteredUser is never re-linked or reset.
export async function linkTicketPurchase(
  email: string,
  name: string,
  ticket: PurchasedTicket
): Promise<LinkResult> {
  await connectMongoDB();

  let registeredUser = await RegisteredUser.findOne({ linkedEmail: email });
  if (registeredUser) {
    if (!registeredUser.name && name) {
      registeredUser.name = name;
      await registeredUser.save();
    }
  } else {
    try {
      registeredUser = await RegisteredUser.create({
        linkedEmail: email,
        name,
        isLinked: false,
      });
    } catch (err: unknown) {
      // Duplicate key from a concurrent/retried delivery for the same email
      // is not an error here - the record already exists, which is the goal.
      const isDuplicateKey =
        typeof err === "object" && err !== null && "code" in err && err.code === 11000;
      if (!isDuplicateKey) throw err;
      registeredUser = await RegisteredUser.findOne({ linkedEmail: email });
    }
  }

  if (!registeredUser) return { linked: false, purchasedTicketName: ticket.name };

  const matchedUser = await User.findOne({ email });
  if (!matchedUser) return { linked: false, purchasedTicketName: ticket.name };

  // Already linked to this account - nothing to do, but report it as linked
  // so callers can treat the purchase as complete.
  if (matchedUser.linked_email === email && registeredUser.isLinked) {
    return {
      linked: true,
      purchasedTicketName: matchedUser.ticketWizard?.purchasedTicketName ?? ticket.name,
    };
  }

  if (matchedUser.linked_email) return { linked: false, purchasedTicketName: ticket.name };

  const alreadyLinkedElsewhere = await User.findOne({ linked_email: email });
  if (alreadyLinkedElsewhere) return { linked: false, purchasedTicketName: ticket.name };

  matchedUser.linked_email = email;
  matchedUser.ticketWizard.currentStep = "completed";
  matchedUser.ticketWizard.purchasedTicketTypeId = ticket.ticketTypeId;
  matchedUser.ticketWizard.purchasedTicketName = ticket.name;
  await matchedUser.save();

  registeredUser.isLinked = true;

  const demographics = await DemographicInfo.findOne({
    user: matchedUser._id,
  }).lean<{ studentEmail?: string; personalEmail?: string }>();
  if (demographics) {
    if (!registeredUser.studentEmail) registeredUser.studentEmail = demographics.studentEmail;
    if (!registeredUser.personalEmail) registeredUser.personalEmail = demographics.personalEmail;
  }
  await registeredUser.save();

  return { linked: true, purchasedTicketName: ticket.name };
}

// Asks Ticket Tailor directly whether this email has a completed order and,
// if so, links it. Lets a purchase be detected even when the webhook isn't
// registered or couldn't reach us (e.g. local dev), and is what makes a
// ticket bought in a new tab show up without any manual step.
export async function reconcileTicketPurchase(
  email: string,
  name: string
): Promise<LinkResult> {
  const ticket = await findCompletedOrderByEmail(email);
  if (!ticket) return { linked: false, purchasedTicketName: null };
  return linkTicketPurchase(email, name, ticket);
}
