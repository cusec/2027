"use client";

import { useSyncExternalStore } from "react";
import { CircleCheck, X } from "lucide-react";
import { TICKET_LINKED_FLAG } from "@/lib/ticketLinkedFlag";

// sessionStorage has no change event within the same tab, so dismissing
// notifies subscribers itself.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readFlag() {
  try {
    return sessionStorage.getItem(TICKET_LINKED_FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Confirms a just-finished purchase on the /scavenger preview. The purchase
 * step sets the flag right before signing the delegate out, so this only ever
 * shows in the tab that bought the ticket, and never on a server render.
 */
export default function TicketLinkedNotice() {
  const linked = useSyncExternalStore(subscribe, readFlag, () => false);

  if (!linked) return null;

  const dismiss = () => {
    try {
      sessionStorage.removeItem(TICKET_LINKED_FLAG);
    } catch {
      // nothing stored, nothing to clear
    }
    listeners.forEach((listener) => listener());
  };

  return (
    <div className="aero-preview__linked" role="status">
      <CircleCheck aria-hidden="true" />
      <p>
        <strong>Your ticket is linked.</strong> You are all set. We signed you
        out for now. At the conference, sign in with the same account and your
        ticket will already be connected.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss">
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
