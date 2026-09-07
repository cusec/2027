import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CUSEC 2027",
  description:
    "What personal information CUSEC 2027 collects, why, and how long we keep it.",
};

/**
 * Carried over from https://2026.cusec.net/privacy-policy and extended to
 * describe what this year's site actually collects — the Auth0 account, the
 * delegate survey, the Ticket Tailor order and the scavenger hunt. Keeping
 * the 2026 wording where it still applies means the two years don't
 * contradict each other.
 *
 * Written in English only: translating a policy is the organizing team's
 * call, not a mechanical one, so fr-CA delegates see this text too.
 */
export default function PrivacyPolicyPage() {
  return (
    <>
      <header className="v2-policy__head">
        <h1 className="v2-policy__title">Privacy Policy</h1>
        <p className="v2-policy__updated">Effective January 2027 edition</p>
      </header>

      <article className="v2-policy__body">
        <p>
          Your privacy is important to us. It is CUSEC&rsquo;s policy to respect
          your privacy regarding any information we may collect from you across
          our website, <a href="https://2027.cusec.net">https://2027.cusec.net</a>,
          and other sites we own and operate.
        </p>
        <p>
          We only ask for personal information when we truly need it to provide
          a service to you. We collect it by fair and lawful means, with your
          knowledge and consent. We also let you know why we&rsquo;re collecting
          it and how it will be used.
        </p>

        <h2>What we collect</h2>

        <h3>Your account</h3>
        <p>
          Signing in creates an account through Auth0, our authentication
          provider. We receive your email address and display name, and — if you
          sign in with Google or GitHub — whatever that provider shares with us.
          We never see your password.
        </p>

        <h3>Your ticket</h3>
        <p>
          Tickets are sold through Ticket Tailor. Their checkout collects your
          name, email, student email, university, expected graduation and
          degree, and payment is handled by Stripe — we never see or store your
          card details. We store the order&rsquo;s email address so we can link
          the ticket to your account, and the name of the ticket you bought.
        </p>

        <h3>The delegate survey</h3>
        <p>
          After creating an account you are asked a short set of questions that
          Ticket Tailor does not already cover: your pronouns, t-shirt size,
          dietary restrictions, field of study or job, whether your school has a
          head delegate, how you heard about CUSEC, which events you are excited
          for, how you are travelling to the conference, and optional free-text
          answers and links (resume, GitHub, LinkedIn). This is used to run the
          conference — catering, swag, scheduling, and telling you about travel
          discounts — and is not published.
        </p>

        <h3>The scavenger hunt</h3>
        <p>
          If you take part, we store the items you have claimed, your points,
          purchases from the points shop, challenge submissions, any team you
          join, and your Discord handle if you provide one. Your display name
          and score appear on a leaderboard visible to other signed-in
          delegates.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To sell you a ticket and get you into the conference.</li>
          <li>
            To plan the event — food, sizes, accessibility, room capacity, and
            sharing travel discounts with the delegates they apply to.
          </li>
          <li>To run the scavenger hunt and its leaderboard.</li>
          <li>To email you about the conference you registered for.</li>
        </ul>

        <h2>What we share</h2>
        <p>
          We don&rsquo;t share any personally identifying information publicly
          or with third parties, except when required by law. We do rely on
          service providers to operate the conference — Auth0 for sign-in,
          Ticket Tailor and Stripe for ticketing and payment, MongoDB Atlas and
          Vercel for hosting — and your data passes through them for those
          purposes only.
        </p>
        <p>
          Sponsors do not receive your information unless you choose to share it
          with them, for example by handing over a resume at the conference.
        </p>
        <p>
          Our website may link to external sites that are not operated by us.
          Please be aware that we have no control over the content and practices
          of these sites, and cannot accept responsibility or liability for
          their respective privacy policies.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We only retain collected information for as long as necessary to
          provide you with your requested service. What data we store, we&rsquo;ll
          protect within commercially acceptable means to prevent loss and
          theft, as well as unauthorized access, disclosure, copying, use, or
          modification.
        </p>

        <h2>Your choices</h2>
        <p>
          You are free to refuse our request for your personal information, with
          the understanding that we may be unable to provide you with some of
          your desired services. You can ask us to show you what we hold about
          you, correct it, or delete it, by emailing{" "}
          <a href="mailto:info@cusec.net">info@cusec.net</a>. Your continued use
          of our website will be regarded as acceptance of our practices around
          privacy and personal information.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about how we handle user data and personal information:{" "}
          <a href="mailto:info@cusec.net">info@cusec.net</a>.
        </p>
      </article>
    </>
  );
}
