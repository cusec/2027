type Sponsor = {
	name: string;
	logo: string;
	width: number;
	height: number;
	website: string;
};

// Keep categories aligned with public/assets/sponsors/. File paths retain the
// supplied filenames so replacing a logo does not require renaming the asset.
export const SPONSOR_GROUPS = [
	{
		key: "partner",
		sponsors: [
			{
				name: "Tangerine",
				logo: "partner/tangerine.svg",
				width: 801,
				height: 165,
				website: "https://www.tangerine.ca/en/personal",
			},
		],
	},
	{
		key: "silver",
		sponsors: [
			{
				name: "CSE / CST",
				logo: "silver/CSE.svg",
				width: 526,
				height: 184,
				website: "https://www.cse-cst.gc.ca/en",
			},
			{
				name: "Ubit Foundation",
				logo: "silver/ubit-logo-v2.svg",
				width: 716,
				height: 477,
				website: "https://www.ubit.foundation/",
			},
		],
	},
	{
		key: "bronze",
		sponsors: [
			{
				name: "Lightspeed",
				logo: "bronze/lightspeed.svg",
				width: 712,
				height: 166,
				website: "https://www.lightspeedhq.com/",
			},
			{
				name: "Schwarzman Scholars",
				logo: "bronze/schwarzman-scholars.svg",
				width: 475,
				height: 435,
				website: "https://www.schwarzmanscholars.org/",
			},
		],
	},
	{
		key: "custom",
		sponsors: [
			{
				name: "Tourisme Montréal",
				logo: "custom/tourisme-montreal 1.svg",
				width: 339,
				height: 178,
				website: "https://www.mtl.org/en",
			},
			{
				name: "Ordre des ingénieurs du Québec",
				logo: "custom/OiQ.svg",
				width: 491,
				height: 173,
				website: "https://www.oiq.qc.ca/",
			},
			{
				name: "Schulich Leader Scholarships",
				logo: "custom/schulich-leader 1.svg",
				width: 419,
				height: 157,
				website: "https://schulichleaders.com/",
			},
			{
				name: "Intact Insurance",
				logo: "custom/intactinsurance.svg",
				width: 364,
				height: 159,
				website: "https://www.intact.ca/en/about-intact-insurance",
			},
		],
	},
	{
		key: "in-kind",
		sponsors: [
			{
				name: "Air Canada",
				logo: "in-kind/air-canada.svg",
				width: 606,
				height: 79,
				website: "https://www.aircanada.com/en-ca/",
			},
			{
				name: "Porter",
				logo: "in-kind/porter.svg",
				width: 353,
				height: 129,
				website: "https://www.flyporter.com/en-ca/",
			},
			{
				name: "WestJet",
				logo: "in-kind/westjet.svg",
				width: 479,
				height: 96,
				website: "https://www.westjet.com/en-ca",
			},
			{
				name: "VIA Rail",
				logo: "in-kind/via-rail.png",
				width: 816,
				height: 442,
				website: "https://www.viarail.ca/en",
			},
			{
				name: "Backboard",
				logo: "in-kind/backboard.svg",
				width: 625,
				height: 93,
				website: "https://backboard.io/",
			},
			{
				name: "Devmaxx",
				logo: "in-kind/devmaxx.svg",
				width: 427,
				height: 98,
				website: "https://www.devmaxx.dev/",
			},
		],
	},
	{
		key: "community-partner",
		sponsors: [
			{
				name: "Apathy is Boring",
				logo: "community-partner/apathy-is-boring.svg",
				width: 338,
				height: 142,
				website: "https://www.apathyisboring.com/",
			},
			{
				name: "Startup Ecosystem Canada",
				logo: "community-partner/startup-ecosystem.svg",
				width: 224,
				height: 224,
				website: "https://www.startupecosystem.ca/",
			},
		],
	},
] as const satisfies readonly {
	key: string;
	sponsors: readonly Sponsor[];
}[];
