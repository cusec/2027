"use client";

import { useEffect } from "react";

/**
 * Fades sections in as they scroll into view.
 *
 * Mounted once per page rather than wrapping each section, so every section
 * stays a server component — it just finds `.v2-reveal` in the DOM and adds
 * `.is-in`. Reveals are one-way: an element is unobserved once shown, so
 * scrolling back up doesn't replay anything.
 */

export default function V2ScrollReveal() {
	useEffect(() => {
		const targets = Array.from(
			document.querySelectorAll<HTMLElement>(".v2-reveal")
		);
		if (!targets.length) return;

		const showAll = () => {
			for (const el of targets) el.classList.add("is-in");
		};

		// `.v2-reveal` is hidden by default, so anything that stops the observer
		// running has to fall back to showing the content, never to hiding it.
		if (
			typeof IntersectionObserver === "undefined" ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			showAll();
			return;
		}

		let delivered = false;

		const observer = new IntersectionObserver(
			(entries) => {
				delivered = true;
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("is-in");
					observer.unobserve(entry.target);
				}
			},
			// Trip a little before the section's top edge reaches the bottom of the
			// viewport, so the fade finishes about when the content is properly in
			// frame rather than starting after it has already arrived.
			{ threshold: 0, rootMargin: "0px 0px -12% 0px" }
		);

		for (const el of targets) observer.observe(el);

		// An observer always reports every target's initial state shortly after
		// observe(), so one callback having landed proves it is live. If none has,
		// the environment isn't delivering them at all and the whole page below the
		// hero would sit invisible — show everything rather than risk that. (Seen
		// for real: headless Chrome under --virtual-time-budget never delivers.)
		const backstop = window.setTimeout(() => {
			if (!delivered) showAll();
		}, 2500);

		return () => {
			window.clearTimeout(backstop);
			observer.disconnect();
		};
	}, []);

	return null;
}
