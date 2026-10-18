import type { Localized } from "@/lib/localized";

export type Speaker = {
	name: string;
	/** "Role · Company". Job titles and company names stay in their own language */
	role: string;
	/** one or two sentences on who they are and what they will share */
	bio?: Localized;
	/** path under public/. Portrait crops sit best in the cards */
	photo?: string;
	/** object-position for the photo, when the face isn't dead centre */
	focus?: string;
	linkedin?: string;
	website?: string;
};

export type Keynote = Speaker & {
	/** talk title. A proper noun, so it lives here rather than in messages */
	talk?: string;
};

/*
 * PLACEHOLDER - both lists mirror the Figma frame ("Keynote speaker",
 * "Speaker name") so the page has its real shape. Replace them with the
 * confirmed lineup before launch.
 *
 * Set KEYNOTES to [] to drop the keynote card, and SPEAKERS to [] to drop the
 * grid. With both empty the page falls back to "Coming soon".
 */
export const KEYNOTES: Keynote[] = [
	{
		name: "Keynote speaker",
		role: "Role · Company",
		talk: "Keynote talk title",
		bio: {
			"en-CA":
				"A short introduction to the keynote speaker, their work, and what they will share at CUSEC.",
			"fr-CA":
				"Une courte présentation de la personne conférencière, de son travail et de ce qu’elle partagera à CUSEC.",
		},
		linkedin: "https://www.linkedin.com/company/cusec/",
		website: "https://www.cusec.net",
	},
];

export const SPEAKERS: Speaker[] = Array.from({ length: 9 }, () => ({
	name: "Speaker name",
	role: "Role · Company",
	bio: {
		"en-CA": "A short introduction to the speaker and their work.",
		"fr-CA": "Une courte présentation de la personne conférencière et de son travail.",
	},
	linkedin: "https://www.linkedin.com/company/cusec/",
	website: "https://www.cusec.net",
}));
