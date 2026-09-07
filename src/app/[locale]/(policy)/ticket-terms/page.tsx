import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Ticket Terms — CUSEC 2027",
  description:
    "Terms covering CUSEC 2027 ticket sales: who you are buying from, payment, refunds and admission.",
};

/**
 * Ticket sale terms. Everything stated here is drawn from how the purchase
 * flow actually works (Ticket Tailor sells, Stripe charges, one ticket per
 * account, the ticket links by email) or from the published FAQ.
 *
 * The refund window and the no-resale rule are the FAQ's wording (V2.faq.a5
 * on site/v2) rather than anything invented here — if the FAQ changes, change
 * this with it, or the two say different things to the same delegate.
 */
export default function TicketTermsPage() {
  return (
    <>
      <header className="v2-policy__head">
        <h1 className="v2-policy__title">Ticket Terms</h1>
        <p className="v2-policy__updated">For CUSEC 2027 ticket sales</p>
      </header>

      <article className="v2-policy__body">
        <p>
          These terms cover tickets to CUSEC 2027, the 26th Canadian University
          Software Engineering Conference, held in Montréal, Québec in January
          2027. Buying a ticket means you accept these terms, our{" "}
          <Link href="/code-of-conduct">Code of Conduct</Link> and our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>

        <h2>Who you are buying from</h2>
        <p>
          Tickets are sold by CUSEC through Ticket Tailor, our ticketing
          platform. Payment is processed by Stripe and goes directly to CUSEC;
          Ticket Tailor never holds your money and we never see your card
          details. Your receipt and ticket come from Ticket Tailor by email.
        </p>

        <h2>Prices and taxes</h2>
        <p>
          Prices are shown in Canadian dollars at checkout, and the total you
          are charged — including any applicable taxes and fees — is the total
          shown before you confirm payment.
        </p>

        <h2>One ticket per account</h2>
        <p>
          Each CUSEC account may hold one ticket. Your ticket is matched to your
          account by the email address used at checkout, so we recommend using
          the same address for both. If they differ you can link them yourself
          on the purchase step, or email us and we will do it.
        </p>

        <h2>Refunds</h2>
        <p>
          Refunds are available for <strong>30 days after purchase</strong>, or
          until <strong>December 27, 2026 at 11:59 PM EST</strong>, whichever
          comes first. A refund is returned to the card that paid for it.
        </p>
        <p>
          If you cannot attend, email{" "}
          <a href="mailto:info@cusec.net">info@cusec.net</a> — and copy your
          Head Delegate if you have one — as early as you can. We will do what
          we can to help.
        </p>

        <h2>Resale</h2>
        <p>
          You may not resell a CUSEC ticket above the price you paid for it.
        </p>

        <h2>Transfers</h2>
        <p>
          Tickets are issued to a named delegate. To pass yours to someone else,
          contact <a href="mailto:info@cusec.net">info@cusec.net</a> rather than
          handing the ticket over directly, so we can re-issue it and keep the
          attendee list accurate.
        </p>

        <h2>Admission</h2>
        <p>
          Bring your ticket — printed or on your phone — and photo ID matching
          the name on it. We may refuse admission to, or remove, anyone in
          breach of the <Link href="/code-of-conduct">Code of Conduct</Link>, without
          a refund.
        </p>

        <h2>Changes to the event</h2>
        <p>
          The schedule, speakers and venue arrangements may change. If CUSEC
          2027 is cancelled outright, ticket holders will be refunded. We are
          not responsible for travel or accommodation you book independently, so
          please consider that when making arrangements.
        </p>

        <h2>Travel and accommodation</h2>
        <p>
          A ticket covers conference admission only. Any travel discounts we
          arrange are shared with ticket holders by email and are subject to the
          providers&rsquo; own terms.
        </p>

        <h2>Contact</h2>
        <p>
          Anything about your order:{" "}
          <a href="mailto:info@cusec.net">info@cusec.net</a>.
        </p>
      </article>
    </>
  );
}
