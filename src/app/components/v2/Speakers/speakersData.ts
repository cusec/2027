export type Speaker = {
	/** message key under V2.speakers for the topic chip */
	topic: string;
	/** avatar circle gradient, sampled from the Figma frame */
	from: string;
	to: string;
	/**
	 * Set once a speaker is announced. While undefined the card shows the
	 * "?" placeholder and "Announcing this Fall", which is the state the whole
	 * grid is in until the lineup drops.
	 */
	announced?: {
		name: string;
		role: string;
		photo: string;
		/** object-position for the photo, when the face isn't dead centre */
		focus?: string;
	};
};

export type AnnouncedKeynote = {
	name: string;
	role: string;
	/** talk title — a proper noun, so it lives here rather than in messages */
	talk: string;
	photo: string;
	/** object-position for the photo, when the face isn't dead centre */
	focus?: string;
	from: string;
	to: string;
};

export const ANNOUNCED_KEYNOTES: AnnouncedKeynote[] = [];

export const SPEAKERS: Speaker[] = [
	{ topic: "ai-ml", from: "#B5E054", to: "#89C24C" },
	{ topic: "systems", from: "#9FF4DB", to: "#60D3B3" },
	{ topic: "web", from: "#94BBEA", to: "#78ADF3" },
	{ topic: "career", from: "#F6E280", to: "#EBCA56" },
	{ topic: "security", from: "#A5F2E8", to: "#7CCCEE" },
	{ topic: "design", from: "#ADE366", to: "#64CF99" },
	{ topic: "oss", from: "#A1CBE8", to: "#AEF2E7" },
	{ topic: "grad", from: "#EEE981", to: "#CDE960" },
];
