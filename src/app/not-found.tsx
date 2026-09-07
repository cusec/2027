/**
 * The 404. Lives at the app root rather than under [locale] so it also
 * catches paths that never resolve to a locale segment at all.
 *
 * Deliberately not localized: next-intl's provider is set up inside
 * [locale]/layout.tsx, and a page reached by an unmatched URL may render
 * outside it. English only beats a render error.
 */
export default function NotFound() {
  return (
    <div className="v2 v2-aero">
      <div className="v2-scene">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="v2-scene__backdrop"
          src="/assets/v2/background-unified.webp"
          alt=""
          width={2560}
          height={12360}
          aria-hidden="true"
        />

        <main className="v2-404">
          <div className="v2-404__inner">
            <p className="v2-404__eyebrow">Error 404</p>

            {/* The middle zero is a soap bubble — the painting is full of
                them, and it beats a third numeral. Decorative: the eyebrow
                above already says "Error 404" out loud. */}
            <p className="v2-404__code" aria-hidden="true">
              <span>4</span>
              <span className="v2-404__bubble" />
              <span>4</span>
            </p>

            <h1 className="v2-404__title">This page floated away</h1>
            <p className="v2-404__body">
              The address you tried doesn&rsquo;t lead anywhere — or leads
              somewhere that isn&rsquo;t open yet. More of the site unlocks as
              January gets closer.
            </p>

            <div className="v2-404__links">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="cta-btn">
                Back to CUSEC 2027
              </a>
            </div>

            <div className="v2-404__minor">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/code-of-conduct">Code of conduct</a>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/privacy-policy">Privacy policy</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
