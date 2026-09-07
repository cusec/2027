import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code of Conduct — CUSEC 2027",
  description:
    "The behaviour expected of everyone taking part in CUSEC 2027, and how to report a violation.",
};

/**
 * Carried over from https://2026.cusec.net/code-of-conduct. The wording is the
 * organizing team's, kept as-is so the policy doesn't quietly shift year to
 * year; only the year and site references are updated.
 */
export default function CodeOfConductPage() {
  return (
    <>
      <header className="v2-policy__head">
        <h1 className="v2-policy__title">Code of Conduct</h1>
        <p className="v2-policy__updated">Applies online and in person</p>
      </header>

      <article className="v2-policy__body">
        <p>
          All participants of CUSEC are expected to abide by our Code of
          Conduct, both online and during in-person events that are hosted
          and/or associated with CUSEC.
        </p>

        <h2>The Pledge</h2>
        <p>
          In the interest of fostering an open and welcoming environment, we
          pledge to make participation in our project and our community a
          harassment-free experience for everyone, regardless of age, body size,
          disability, ethnicity, gender identity and expression, level of
          experience, nationality, personal appearance, race, religion, or
          sexual identity and orientation.
        </p>

        <h2>The Standards</h2>
        <h3>Behaviour that contributes to a positive environment</h3>
        <ul>
          <li>Using welcoming and inclusive language.</li>
          <li>Being respectful of differing viewpoints and experiences.</li>
          <li>Gracefully accepting constructive criticism.</li>
          <li>
            Referring to people by their preferred pronouns and using
            gender-neutral pronouns when uncertain.
          </li>
        </ul>

        <h3>Unacceptable behaviour</h3>
        <ul>
          <li>
            Trolling, insulting or derogatory comments, public or private
            harassment.
          </li>
          <li>Publishing others&rsquo; private information without permission.</li>
          <li>Not respecting reasonable communication boundaries.</li>
          <li>
            Using sexualized language or imagery, or unwelcome sexual attention.
          </li>
          <li>Swearing, strong or disturbing language.</li>
          <li>Displaying disturbing graphics or content.</li>
          <li>Starting or participating in arguments about politics.</li>
          <li>Promoting inequality of any kind.</li>
          <li>Drug promotion.</li>
          <li>Attacking personal tastes.</li>
          <li>Other conduct inappropriate in a professional setting.</li>
        </ul>

        <h2>Enforcement</h2>
        <p>
          Violations of the Code of Conduct may be reported by sending an email
          to <a href="mailto:incidents@cusec.net">incidents@cusec.net</a>. All
          reports will be reviewed and investigated, resulting in responses
          deemed appropriate. We reserve the right to remove comments or
          contributions not aligned with this Code of Conduct.
        </p>
        <p>
          Conference staff are available to help participants contact
          hotel/venue security, local law enforcement, provide escorts, or
          assist those experiencing harassment.
        </p>

        <h2>Contact</h2>
        <dl>
          <dt>Report an incident</dt>
          <dd>
            <a href="mailto:incidents@cusec.net">incidents@cusec.net</a>
          </dd>
          <dt>Non-emergency local law enforcement (SPVM)</dt>
          <dd>
            <a href="tel:+15142802222">+1 (514) 280-2222</a>
          </dd>
          <dt>Emergency</dt>
          <dd>911</dd>
        </dl>
      </article>
    </>
  );
}
