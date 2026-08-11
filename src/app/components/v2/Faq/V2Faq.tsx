"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

const PADS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const TICKETS_URL = "https://www.tickettailor.com/events/cusec";
const HOTEL_URL =
	"https://bookings.omnihotels.com/event/montreal-mont-royal/cusec-main-block";

export default function V2Faq() {
	const t = useTranslations("V2.faq");
	// exactly one pad open at a time; clicking the open one closes it
	const [openPad, setOpenPad] = useState<number | null>(1);

	// shared rich-text tags so the answers can carry bold, lists and links
	const tags = {
		p: (chunks: ReactNode) => <p>{chunks}</p>,
		b: (chunks: ReactNode) => <strong>{chunks}</strong>,
		ul: (chunks: ReactNode) => <ul className="v2-pad__list">{chunks}</ul>,
		li: (chunks: ReactNode) => <li>{chunks}</li>,
		tickets: (chunks: ReactNode) => (
			<a href={TICKETS_URL} target="_blank" rel="noreferrer noopener">
				{chunks}
			</a>
		),
		hotel: (chunks: ReactNode) => (
			<a href={HOTEL_URL} target="_blank" rel="noreferrer noopener">
				{chunks}
			</a>
		),
		email: (chunks: ReactNode) => <a href="mailto:info@cusec.net">{chunks}</a>,
	};

	return (
		<section className="v2-section v2-faq" id="faq">
			<div className="v2-container">
				<div className="v2-faq__head">
					<h2 className="v2-heading-pill">{t("heading")}</h2>
				</div>

				<div className="v2-faq__pond">
					{PADS.map((n) => {
						const isOpen = openPad === n;
						return (
							<div
								key={n}
								className={`v2-pad v2-pad--${n}${isOpen ? " is-open" : ""}`}
							>
								<button
									type="button"
									className="v2-pad__q"
									aria-expanded={isOpen}
									aria-controls={`v2-faq-a-${n}`}
									onClick={() => setOpenPad(isOpen ? null : n)}
								>
									{t(`q${n}`)}
									<span className="v2-pad__toggle" aria-hidden="true" />
								</button>

								{/* 0fr -> 1fr on the wrapper reveals the answer without
								    reflowing its text — see sponsors-faq.css */}
								<div className="v2-pad__a" id={`v2-faq-a-${n}`} role="region">
									<div className="v2-pad__body">{t.rich(`a${n}`, tags)}</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
