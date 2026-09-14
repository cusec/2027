import {
  CircleHelp,
  Clock,
  Gem,
  Puzzle,
  QrCode,
  Sparkles,
  Ticket,
  Trophy,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBaseUrl } from "@/lib/siteUrl";
import TicketLinkedNotice from "./TicketLinkedNotice";
import DashboardFAQ from "./faqs/DashboardFAQ";

const faqFor = (huntOpen: boolean) => [
  {
    question: "When does the scavenger hunt open?",
    answer: huntOpen ? (
      <p>
        It is open now. Sign in with the CUSEC account you bought your ticket
        with and start scanning.
      </p>
    ) : (
      <p>
        During CUSEC 2027 itself, in Montréal this January. Until then this
        page is a preview: the hunt, challenge submissions and hunt profiles
        are switched off, and there is nothing you need to do ahead of time.
      </p>
    ),
  },
  {
    question: "Who can take part?",
    answer: (
      <p>
        Every CUSEC 2027 attendee. Your hunt account is the CUSEC account you
        bought your ticket with, and the ticket links to it automatically when
        the emails match. If you checked out with a different email, link it
        from the purchase step of the ticket flow, or ask an organizer at the
        conference.
      </p>
    ),
  },
  {
    question: "What are hunt items, and how do I claim them?",
    answer: (
      <p>
        Hunt items are QR codes, or short codes, found throughout the
        conference: in talks, at sponsor booths and around the venue. Scan one
        with the scanner in the hunt or your phone&rsquo;s camera, or type the
        code in by hand. Each claim adds the item to your bag and points to
        your score.
      </p>
    ),
  },
  {
    question: "How do challenges work?",
    answer: (
      <p>
        Challenges are posted during the conference. Some are solo and some are
        for a team of up to four. Record a short video, submit the link, and
        once an organizer approves it the challenge&rsquo;s points are added to
        your score.
      </p>
    ),
  },
  {
    question: "What can I do with my points?",
    answer: (
      <p>
        Points move you up the live leaderboard and can be spent on
        collectibles and prizes. Physical prizes are picked up at the prize
        booth at scheduled times during the conference.
      </p>
    ),
  },
  {
    question: "What are the rules?",
    answer: (
      <p>
        Everyone taking part follows CUSEC&rsquo;s{" "}
        <Link href="/code-of-conduct">code of conduct</Link> and{" "}
        <Link href="/privacy-policy">privacy policy</Link>. Hunt codes are not
        to be shared with other attendees, so the competition stays fair.
      </p>
    ),
  },
  {
    question: "Where do I get help?",
    answer: (
      <p>
        Ask any organizer at the conference, or stop by the prize booth.
        Support details will be shared on the official CUSEC 2027 Discord
        server closer to the event.
      </p>
    ),
  },
];

const HOW_IT_WORKS = [
  {
    icon: QrCode,
    title: "Scan and earn",
    body: "Find QR codes hidden around the venue, in talks, at sponsor booths and down the hallways. Every scan earns you points.",
  },
  {
    icon: Puzzle,
    title: "Solve puzzles",
    body: "Earn more by cracking riddles and technical puzzles designed to test your skills.",
  },
  {
    icon: Trophy,
    title: "Win prizes",
    body: "Climb the live leaderboard and spend your points on exclusive CUSEC merch, stickers and sponsor items.",
  },
];

const NEW_THIS_YEAR = [
  {
    icon: Video,
    title: "Challenge submissions",
    body: "Take on challenges during the conference, record a short video and submit the link. Approved entries earn points.",
  },
  {
    icon: Users,
    title: "Team challenges",
    body: "Some challenges are played in teams of up to four. Start a team, or join one with its code.",
  },
  {
    icon: Gem,
    title: "Collectibles",
    body: "Spend points on collectibles that live in your bag, alongside the prizes you pick up at the booth.",
  },
  {
    icon: UserRound,
    title: "Your hunt profile",
    body: "A profile card with your avatar, your points and everything you have collected.",
  },
  {
    icon: Ticket,
    title: "Linked to your ticket",
    body: "Buy your ticket with your CUSEC account and it links on its own. No separate linking step when the hunt opens.",
  },
];

export default async function ScavengerPreview({
  signedIn,
  huntOpen = false,
}: {
  signedIn: boolean;
  huntOpen?: boolean;
}) {
  const signOutHref = signedIn
    ? `/auth/logout?returnTo=${encodeURIComponent(`${await getBaseUrl()}/scavenger`)}`
    : null;

  return (
    <section className="aero-page aero-preview">
      <header className="aero-preview__hero">
        <h1 className="aero-title aero-preview__title">Scavenger Hunt</h1>
        <p className="aero-preview__lead">
          Scan codes hidden around the venue, take on challenges with your
          team, and climb the live leaderboard for prizes.
        </p>
        {!huntOpen && (
          <p className="aero-preview__when">
            <Clock aria-hidden="true" />
            Opens at the conference, in Montréal this January
          </p>
        )}

        <TicketLinkedNotice />

        <div className="aero-preview__actions">
          {huntOpen ? (
            // Auth0 owns /auth/*, so this has to be a full document request.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/auth/login?returnTo=/scavenger" className="aero-btn">
              <Trophy aria-hidden="true" />
              Start hunting
            </a>
          ) : (
            <Link href="/tickets" className="aero-btn">
              <Ticket aria-hidden="true" />
              Get your ticket
            </Link>
          )}
          <a href="#faq" className="aero-btn aero-btn--glass">
            <CircleHelp aria-hidden="true" />
            FAQ
          </a>
        </div>
      </header>

      {!huntOpen && (
        <div className="v2-card v2-glass aero-preview__notice">
          <h2>Nothing to do until the conference</h2>
          <p>
            The hunt, challenge submissions and your hunt profile all unlock
            during CUSEC 2027 itself. If you have a ticket, it is already linked
            to your CUSEC account. At the conference, sign in with that same
            account and start scanning.
          </p>
          {signOutHref && (
            <p className="aero-preview__account">
              You are signed in.{" "}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href={signOutHref}>Sign out</a>
            </p>
          )}
        </div>
      )}

      <section className="aero-sec">
        <h2 className="aero-sec__title">
          <QrCode aria-hidden="true" />
          How it works
        </h2>
        <div className="aero-notes">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="v2-card v2-glass aero-note">
              <span className="aero-preview__icon" aria-hidden="true">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="aero-sec">
        <h2 className="aero-sec__title">
          <Sparkles aria-hidden="true" />
          New for 2027
        </h2>
        <div className="aero-notes">
          {NEW_THIS_YEAR.map(({ icon: Icon, title, body }) => (
            <article key={title} className="v2-card v2-glass aero-note">
              <span className="aero-preview__icon" aria-hidden="true">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <DashboardFAQ id="faq" heading="Questions, answered" items={faqFor(huntOpen)} />
    </section>
  );
}
