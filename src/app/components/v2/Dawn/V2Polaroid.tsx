type Props = {
	src: string;
	caption: string;
	tilt?: number;
	className?: string;
};

export default function V2Polaroid({ src, caption, tilt = -3, className }: Props) {
	return (
		<figure
			className={`v2-polaroid${className ? ` ${className}` : ""}`}
			style={{ "--v2-tilt": `${tilt}deg` } as React.CSSProperties}
		>
			<img src={src} alt="" aria-hidden="true" />
			<figcaption className="v2-pixel">{caption}</figcaption>
		</figure>
	);
}
