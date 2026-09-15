/**
 * The painted backdrop and the element every section sits on.
 *
 * `screens` opts a page into the one-section-per-viewport rhythm. The landing
 * page wants it; the sub-pages are far shorter than the painting and must not
 * be stretched to fill it, so they leave it off (see AGENTS.md).
 */
export default function V2Scene({
	screens = false,
	children,
}: {
	screens?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className={`v2-scene${screens ? " v2-scene--screens" : ""}`}>
			<img
				className="v2-scene__backdrop"
				src="/assets/v2/background-unified.webp"
				alt=""
				width={2560}
				height={12360}
				fetchPriority="high"
				aria-hidden="true"
			/>
			{children}
		</div>
	);
}
