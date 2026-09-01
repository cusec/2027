"use client";

import { useState } from "react";

import faqData from "./DashboardFAQData";

/**
 * Lily-pad FAQ, matching the pattern the main site uses on 2027.cusec.net
 * (site/v2 `V2Faq`): white pads scattered across the painting, exactly one
 * open at a time, each widening to reveal its answer.
 *
 * Deliberately not the shared Radix accordion — the pad's reveal animates
 * both height and width together, which the accordion's height-only
 * transition can't express.
 */
const DashboardFAQ = () => {
  // exactly one pad open at a time; clicking the open one closes it
  const [openPad, setOpenPad] = useState<number | null>(null);

  return (
    <section className="v2-faq" id="Faq">
      <div className="v2-faq__head">
        <h2 className="v2-heading-pill">Additional Information</h2>
      </div>

      <div className="v2-faq__pond">
        {faqData.map((item, index) => {
          const n = index + 1;
          const isOpen = openPad === n;

          return (
            <div
              key={item.question}
              className={`v2-pad v2-pad--${n}${isOpen ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="v2-pad__q"
                aria-expanded={isOpen}
                aria-controls={`dash-faq-a-${n}`}
                onClick={() => setOpenPad(isOpen ? null : n)}
              >
                {item.question}
                <span className="v2-pad__toggle" aria-hidden="true" />
              </button>

              {/* 0fr -> 1fr on the wrapper reveals the answer without
                  reflowing its text mid-animation */}
              <div className="v2-pad__a" id={`dash-faq-a-${n}`} role="region">
                <div className="v2-pad__body">{item.answer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DashboardFAQ;
