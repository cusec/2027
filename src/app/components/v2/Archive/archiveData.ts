export type ArchivePhoto = {
	src: string;
	/** 480px copy for the strip, so a card swap never pulls four full photos. */
	thumb: string;
	caption: string;
	stamp?: string;
};

export type ArchiveEdition = {
	year: number;
	count: number;
	from: string;
	to: string;
	photos: ArchivePhoto[];
};

// Keep new photos at 1800px on the long edge (webp q80) and add a 480px copy
// under thumbs/. Camera originals (6000px, 15 MB) made the older cards sit
// grey for seconds before anything showed.
const photo = (year: number, file: string, caption: string): ArchivePhoto => ({
	src: `/assets/v2/photos/archive/${year}/${year}-${file}.webp`,
	thumb: `/assets/v2/photos/archive/${year}/thumbs/${year}-${file}.webp`,
	caption,
});

export const EDITIONS: ArchiveEdition[] = [
	{
		year: 2026,
		count: 4,
		from: "#1F3B2C",
		to: "#0E2318",
		photos: [
			photo(2026, "01", "audience, 2026"),
			photo(2026, "02", "speaker session, 2026"),
			photo(2026, "03", "speaker session, 2026"),
			photo(2026, "04", "audience, 2026"),
		],
	},
	{
		year: 2025,
		count: 4,
		from: "#2E4FC8",
		to: "#1B2F77",
		photos: [
			photo(2025, "01", "group photo, 2025"),
			photo(2025, "02", "audience, 2025"),
			photo(2025, "04", "sponsor conversations, 2025"),
			photo(2025, "05", "hallway conversations, 2025"),
		],
	},
	{
		year: 2024,
		count: 4,
		from: "#4D7111",
		to: "#2C4310",
		photos: [
			photo(2024, "01", "team photo, 2024"),
			photo(2024, "02", "hallway conversations, 2024"),
			photo(2024, "03", "prize giveaway, 2024"),
			photo(2024, "04", "games night, 2024"),
		],
	},
	{
		year: 2023,
		count: 4,
		from: "#8A1F5A",
		to: "#571239",
		photos: [
			photo(2023, "01", "audience, 2023"),
			photo(2023, "02", "social night, 2023"),
			photo(2023, "03", "group photo, 2023"),
			photo(2023, "04", "speaker session, 2023"),
		],
	},
];
