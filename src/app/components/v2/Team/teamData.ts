import type { Localized } from "@/lib/localized";

export type TeamMember = {
	name: string;
	role: Localized;
	/** path under public/, e.g. /assets/v2/team/jane.webp. Square crops read best. */
	photo?: string;
	/** object-position for the photo, when the face isn't dead centre */
	focus?: string;
	linkedin?: string;
};

export type TeamGroup = {
	/** message key under V2.team, as `group-<id>` */
	id: string;
	members: TeamMember[];
};

/*
 * PLACEHOLDER - every member below mirrors the Figma frame ("Name", "Position")
 * so the page has its real shape. Replace them with the team before launch.
 * A group with no members is skipped, and the page shows "coming soon" if
 * every group is empty.
 */
const placeholder = (count: number): TeamMember[] =>
	Array.from({ length: count }, () => ({
		name: "Name",
		role: { "en-CA": "Position", "fr-CA": "Poste" },
		linkedin: "https://www.linkedin.com/company/cusec/",
	}));

export const TEAM: TeamGroup[] = [
	{ id: "co-chairs", members: placeholder(2) },
	{ id: "head-delegates", members: placeholder(11) },
	{ id: "events", members: placeholder(3) },
	{ id: "speakers", members: placeholder(2) },
	{ id: "sponsorship", members: placeholder(2) },
	{ id: "logistics", members: placeholder(2) },
	{ id: "technology", members: placeholder(3) },
];
