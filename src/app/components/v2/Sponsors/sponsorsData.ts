export type Sponsor = {
	name: string;
	logo: string;
	width: number;
	height: number;
};

// Keep categories aligned with public/assets/sponsors/. File paths retain the
// supplied filenames so replacing a logo does not require renaming the asset.
export const SPONSOR_GROUPS = [
	{
		key: "partner",
		sponsors: [
			{ name: "Tangerine", logo: "partner/tangerine.svg", width: 801, height: 165 },
		],
	},
	{
		key: "silver",
		sponsors: [
			{ name: "CSE / CST", logo: "silver/CSE.svg", width: 526, height: 184 },
			{ name: "Ubit Foundation", logo: "silver/ubit-logo-v2.svg", width: 716, height: 477 },
		],
	},
	{
		key: "bronze",
		sponsors: [
			{ name: "Lightspeed", logo: "bronze/lightspeed.svg", width: 712, height: 166 },
			{ name: "Schwarzman Scholars", logo: "bronze/schwarzman-scholars.svg", width: 475, height: 435 },
		],
	},
	{
		key: "in-kind",
		sponsors: [
			{ name: "Air Canada", logo: "in-kind/air-canada.svg", width: 606, height: 79 },
			{ name: "Backboard", logo: "in-kind/backboard.svg", width: 625, height: 93 },
			{ name: "Devmaxx", logo: "in-kind/devmaxx.svg", width: 427, height: 98 },
			{ name: "Porter", logo: "in-kind/porter.svg", width: 353, height: 129 },
			{ name: "WestJet", logo: "in-kind/westjet.svg", width: 479, height: 96 },
		],
	},
	{
		key: "community-partner",
		sponsors: [
			{ name: "Apathy is Boring", logo: "community-partner/apathy-is-boring.svg", width: 338, height: 142 },
			{ name: "Startup Ecosystem Canada", logo: "community-partner/startup-ecosystem.svg", width: 224, height: 224 },
		],
	},
	// Restore this group when the Custom sponsors are ready to be shown.
	/* {
		key: "custom",
		sponsors: [
			{ name: "Ordre des ingénieurs du Québec", logo: "custom/OiQ.svg", width: 491, height: 173 },
			{ name: "Schulich Leader Scholarships", logo: "custom/schulich-leader 1.svg", width: 419, height: 157 },
			{ name: "Tourisme Montréal", logo: "custom/tourisme-montreal 1.svg", width: 339, height: 178 },
		],
	}, */
] as const satisfies readonly {
	key: string;
	sponsors: readonly Sponsor[];
}[];
