import connectMongoDB from "./mongodb";
import { RegisteredUser, User, DemographicInfo } from "./models";
import {
  findCompletedOrderByEmail,
  type PurchasedTicket,
} from "./ticketTailor";
import { trackServerEvent } from "./analytics/server";
import { ticketCategoryFromName } from "./analytics/events";
import { ensureAnalyticsId } from "./userService";

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
//
// `accountEmail` is the CUSEC account the ticket attaches to, and defaults to
// the purchase email - the automatic paths (webhook, reconciliation) only
// ever link an order to the account that shares its address. It differs only
// on the explicit claim flow, where a signed-in delegate says "I bought with
// this other address"; the caller is responsible for having authenticated
// that account first.
//
// `completionPath` says which path delivered the purchase (webhook,
// reconciliation, or manual claim) and feeds the `ticket_purchase_completed`
// event - the purchase conversion. It is emitted here, after both records are
// saved, so every path shares one source of truth and webhook retries or
// reconciliation polls cannot duplicate it (the already-linked early return
// below never emits).
export async function linkTicketPurchase(
  email: string,
  name: string,
  ticket: PurchasedTicket,
  accountEmail: string = email,
  completionPath: "webhook" | "reconciliation" | "claim" = "reconciliation",
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
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === 11000;
      if (!isDuplicateKey) throw err;
      registeredUser = await RegisteredUser.findOne({ linkedEmail: email });
    }
  }

  if (!registeredUser)
    return { linked: false, purchasedTicketName: ticket.name };

  const matchedUser = await User.findOne({ email: accountEmail });
  if (!matchedUser) return { linked: false, purchasedTicketName: ticket.name };

  // Already linked to this account - nothing to do, but report it as linked
  // so callers can treat the purchase as complete.
  if (matchedUser.linked_email === email && registeredUser.isLinked) {
    return {
      linked: true,
      purchasedTicketName:
        matchedUser.ticketWizard?.purchasedTicketName ?? ticket.name,
    };
  }

  // An account already pointing at this same address (half-linked, e.g. its
  // ticket record was unlinked or recreated) is finished here, not refused.
  if (matchedUser.linked_email && matchedUser.linked_email !== email) {
    return { linked: false, purchasedTicketName: ticket.name };
  }

  const alreadyLinkedElsewhere = await User.findOne({
    linked_email: email,
    _id: { $ne: matchedUser._id },
  });
  if (alreadyLinkedElsewhere)
    return { linked: false, purchasedTicketName: ticket.name };

  // A RegisteredUser already marked linked belongs to some account (possibly
  // matched through its student/personal address by /api/users/link-email,
  // which the User.linked_email lookup above wouldn't catch). Never move it.
  if (registeredUser.isLinked)
    return { linked: false, purchasedTicketName: ticket.name };

  matchedUser.linked_email = email;
  matchedUser.ticketWizard.currentStep = "completed";
  matchedUser.ticketWizard.purchasedTicketTypeId = ticket.ticketTypeId;
  matchedUser.ticketWizard.purchasedTicketName = ticket.name;
  await matchedUser.save();

  registeredUser.isLinked = true;

  const demographics = await DemographicInfo.findOne({
    user: matchedUser._id,
  }).lean<{ primaryEmail?: string; secondaryEmail?: string }>();
  if (demographics) {
    if (!registeredUser.personalEmail && demographics.primaryEmail) {
      registeredUser.personalEmail = demographics.primaryEmail;
    }
    if (!registeredUser.studentEmail && demographics.secondaryEmail) {
      registeredUser.studentEmail = demographics.secondaryEmail;
    }
  }
  await registeredUser.save();

  // The purchase conversion. Only in this branch: the already-linked early
  // return above must not re-emit it.
  void trackServerEvent(
    "ticket_purchase_completed",
    {
      ticket_type: ticketCategoryFromName(ticket.name ?? ""),
      completion_path: completionPath,
    },
    await ensureAnalyticsId(matchedUser),
  );

  return { linked: true, purchasedTicketName: ticket.name };
}

// Asks Ticket Tailor directly whether this email has a completed order and,
// if so, links it. Lets a purchase be detected even when the webhook isn't
// registered or couldn't reach us (e.g. local dev), and is what makes a
// ticket bought in a new tab show up without any manual step.
export async function reconcileTicketPurchase(
  email: string,
  name: string,
): Promise<LinkResult> {
  const ticket = await findCompletedOrderByEmail(email);
  if (!ticket) return { linked: false, purchasedTicketName: null };
  return linkTicketPurchase(email, name, ticket);
}
