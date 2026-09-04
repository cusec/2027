type Props = {
	from: string;
	to: string;
	/** when set, the photo replaces the "?" placeholder */
	photo?: string;
	/** object-position for the photo */
	focus?: string;
	className?: string;
};

/**
 * The gradient disc used for both the keynote teaser and each grid card.
 * Unannounced speakers get a pixel "?" mark; announced ones get their photo.
 */
export default function V2SpeakerAvatar({
	from,
	to,
	photo,
	focus,
	className,
}: Props) {
	return (
		<span
			className={`v2-spk-avatar${className ? ` ${className}` : ""}`}
			style={
				{
					"--avatar-from": from,
					"--avatar-to": to,
					...(focus ? { "--avatar-focus": focus } : {}),
				} as React.CSSProperties
			}
			aria-hidden="true"
		>
			{photo ? (
				<img src={photo} alt="" />
			) : (
				<span className="v2-spk-avatar__mark v2-pixel">?</span>
			)}
		</span>
	);
}
