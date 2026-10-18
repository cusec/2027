/** Mint portrait tile. Decorative: the name sits right beside it. */
export default function V2SpeakerPortrait({
	photo,
	focus,
	className,
}: {
	photo?: string;
	focus?: string;
	className: string;
}) {
	return (
		<span className={`v2-spk-portrait ${className}`} aria-hidden="true">
			{photo ? (
				<img
					src={photo}
					alt=""
					loading="lazy"
					style={focus ? { objectPosition: focus } : undefined}
				/>
			) : (
				<img
					className="v2-spk-portrait__mark"
					src="/assets/v2/logo-icosahedron.webp"
					alt=""
					width={48}
					height={48}
					loading="lazy"
				/>
			)}
		</span>
	);
}
