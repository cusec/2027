/**
 * sessionStorage key set just before a finished purchase signs the delegate
 * out to the /scavenger preview, so that page can confirm the ticket is
 * linked. Client-safe on purpose: both sides of the redirect are client code.
 */
export const TICKET_LINKED_FLAG = "cusec:ticket-linked";
