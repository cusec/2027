/**
 * The approved Vercel Web Analytics event catalog.
 *
 * Rules (docs/analytics-plan.md):
 *   - event names are lowercase snake_case;
 *   - at most two properties per event (the base Pro limit);
 *   - properties are low-cardinality strings - never names, emails, IDs,
 *     free text, or full URLs;
 *   - values must be controlled constants, not display text (so en-CA and
 *     fr-CA produce identical events).
 *
 * This module is client-safe and dependency-free so both the browser
 * wrapper, the server wrapper, and server components can share it.
 */

/** Controlled ticket category derived from a Ticket Tailor ticket name. */
export type TicketCategory = "student" | "professional" | "other";

export function ticketCategoryFromName(name: string): TicketCategory {
  if (/professional|professionnel/i.test(name)) return "professional";
  if (/student|étudiant|etudiant/i.test(name)) return "student";
  return "other";
}

export interface AnalyticsEventProps {
  /** A ticket-intent CTA anywhere on the landing page. */
  ticket_cta_clicked: {
    location: string;
    destination: "passes" | "tickets";
  };
  /** The logged-out /tickets signup CTA. */
  registration_started: {
    location: string;
    method: "auth0_signup";
  };
  /** A new Mongo User was created (server-side only). */
  account_created: {
    entry_point: string;
    method: "auth0";
  };
  /** A wizard section was saved for the first time (server-side only). */
  registration_step_completed: {
    step: "basics" | "background" | "goals" | "travel" | "experience" | "links";
    flow: "ticket_wizard";
  };
  /** basics + background became complete for the first time (server-side only). */
  profile_completed: {
    attendee_type: string;
    flow: "ticket_wizard";
  };
  /** All six sections became complete - ready for purchase (server-side only). */
  registration_completed: {
    flow: "ticket_wizard";
    next_step: "purchase";
  };
  /** A buy action opened or redirected to Ticket Tailor. */
  ticket_checkout_started: {
    ticket_type: TicketCategory;
    checkout_mode: "inline" | "new_tab";
  };
  /** A purchase was linked to the account for the first time (server-side only). */
  ticket_purchase_completed: {
    ticket_type: TicketCategory;
    completion_path: "webhook" | "reconciliation" | "claim";
  };
  /** A sign-in CTA was clicked. */
  login_started: {
    location: string;
    /** App-controlled return path, never a full URL. */
    return_to: string;
  };
  /** A closed FAQ item was opened. */
  faq_opened: {
    faq_id: string;
    page: string;
  };
  /** A footer social link was clicked. */
  social_clicked: {
    platform: string;
    location: string;
  };
  /** A meaningful email/contact CTA was clicked. */
  contact_clicked: {
    purpose: string;
    location: string;
  };
  /** The sponsor application form was opened. */
  sponsor_application_clicked: {
    location: string;
    destination: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventProps;

/**
 * Runtime mirror of the catalog's property keys. Direct `trackEvent` calls
 * are checked by the compiler; the click delegator reads attributes back at
 * runtime, so it validates against this instead - unknown attributes are
 * dropped and the two-property budget holds for every event.
 */
export const EVENT_PROPERTY_KEYS: {
  [K in AnalyticsEventName]: readonly (keyof AnalyticsEventProps[K] & string)[];
} = {
  ticket_cta_clicked: ["location", "destination"],
  registration_started: ["location", "method"],
  account_created: ["entry_point", "method"],
  registration_step_completed: ["step", "flow"],
  profile_completed: ["attendee_type", "flow"],
  registration_completed: ["flow", "next_step"],
  ticket_checkout_started: ["ticket_type", "checkout_mode"],
  ticket_purchase_completed: ["ticket_type", "completion_path"],
  login_started: ["location", "return_to"],
  faq_opened: ["faq_id", "page"],
  social_clicked: ["platform", "location"],
  contact_clicked: ["purpose", "location"],
  sponsor_application_clicked: ["location", "destination"],
};

const EVENT_NAMES: readonly AnalyticsEventName[] = [
  "ticket_cta_clicked",
  "registration_started",
  "account_created",
  "registration_step_completed",
  "profile_completed",
  "registration_completed",
  "ticket_checkout_started",
  "ticket_purchase_completed",
  "login_started",
  "faq_opened",
  "social_clicked",
  "contact_clicked",
  "sponsor_application_clicked",
];

export function isAnalyticsEventName(
  value: string,
): value is AnalyticsEventName {
  return (EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Builds the `data-analytics-*` attribute object for a server-rendered
 * element. The root click delegator (`AnalyticsClickTracking`) reads these
 * back and forwards the event, so server components can emit events without
 * becoming client components. Property keys keep their snake_case spelling
 * in the attribute name (`data-analytics-faq_id`), which is valid HTML.
 */
export function analyticsAttributes<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventProps[K],
): Record<string, string> {
  const attributes: Record<string, string> = { "data-analytics-event": event };
  for (const [key, value] of Object.entries(props)) {
    if (value !== null && value !== undefined && value !== "") {
      attributes[`data-analytics-${key}`] = String(value);
    }
  }
  return attributes;
}
