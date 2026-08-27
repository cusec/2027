export type ArchivePhoto = {
	src: string;
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


function shots(captions: string[], sources: string[]): ArchivePhoto[] {
	return sources.map((src, i) => ({
		src,
		caption: captions[i],
	}));
}

export const EDITIONS: ArchiveEdition[] = [
	{
		year: 2026,
		count: 4,
		from: "#1F3B2C",
		to: "#0E2318",
		photos: shots([
			"audience · 2026",
			"speaker session · 2026",
			"speaker session · 2026",
			"audience · 2026",
		], [
			"/assets/v2/photos/archive/2026-01.jpg",
			"/assets/v2/photos/archive/2026-02.jpg",
			"/assets/v2/photos/archive/2026-03.jpg",
			"/assets/v2/photos/archive/2026-04.jpg",
		]),
	},
	{
		year: 2025,
		count: 4,
		from: "#2E4FC8",
		to: "#1B2F77",
		photos: shots([
			"group photo · 2025",
			"audience · 2025",
			"sponsor conversations · 2025",
			"hallway conversations · 2025",
		], [
			"/assets/v2/photos/archive/2025-01.jpg",
			"/assets/v2/photos/archive/2025-02.jpg",
			"/assets/v2/photos/archive/2025-04.jpg",
			"/assets/v2/photos/archive/2025-05.jpg",
		]),
	},
	{
		year: 2024,
		count: 0,
		from: "#4D7111",
		to: "#2C4310",
		photos: [],
	},
	{
		year: 2023,
		count: 0,
		from: "#8A1F5A",
		to: "#571239",
		photos: [],
	},
];
