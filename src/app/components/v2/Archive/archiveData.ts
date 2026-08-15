export type ArchivePhoto = {
	src: string;
	caption: string;
	stamp: string;
};

export type ArchiveEdition = {
	year: number;
	count: number;
	from: string;
	to: string;
	photos: ArchivePhoto[];
};


const PLACEHOLDER = [
	"/assets/v2/photos/cam_0.webp",
	"/assets/v2/photos/cam_1.webp",
	"/assets/v2/photos/cam_2.webp",
	"/assets/v2/photos/cam_3.webp",
];

function shots(year: number, captions: string[]): ArchivePhoto[] {
	return PLACEHOLDER.map((src, i) => ({
		src,
		caption: captions[i],
		stamp: `JAN 0${9 - (i % 3)} ${year} · ${["23:42", "14:08", "19:27", "11:55"][i]}`,
	}));
}

export const EDITIONS: ArchiveEdition[] = [
	{
		year: 2026,
		count: 128,
		from: "#1F3B2C",
		to: "#0E2318",
		photos: shots(2026, [
			"all 500 of us · closing ceremony",
			"hallway track",
			"main stage",
			"workshops",
		]),
	},
	{
		year: 2025,
		count: 116,
		from: "#2E4FC8",
		to: "#1B2F77",
		photos: shots(2025, [
			"opening ceremony",
			"career fair",
			"keynote",
			"game night",
		]),
	},
	{
		year: 2024,
		count: 104,
		from: "#4D7111",
		to: "#2C4310",
		photos: shots(2024, [
			"delegates arriving",
			"lightning talks",
			"the big room",
			"after hours",
		]),
	},
	{
		year: 2023,
		count: 97,
		from: "#8A1F5A",
		to: "#571239",
		photos: shots(2023, [
			"back in person",
			"sponsor booths",
			"closing keynote",
			"socials",
		]),
	},
];
