export type SponsorTier = "platinum" | "gold" | "silver" | "community";

export type Sponsor = {
	name: string;
	/** path under public/. Wide wordmarks fit the plate best (SVG or transparent PNG/WebP) */
	logo?: string;
	url?: string;
};

/** In page order. Each id has a `tier-name-<id>` message under V2.sponsors. */
export const SPONSOR_TIERS: SponsorTier[] = ["platinum", "gold", "silver", "community"];

/**
 * The sponsorship package linked under the page title. Until it is set the
 * link points at the sponsor interest form instead.
 */
export const SPONSORSHIP_PACKAGE_URL: string | null = null;
export const SPONSOR_FORM_URL = "https://forms.gle/TzbNoCKmALEYryLw7";

/*
 * PLACEHOLDER - mirrors the Figma frame ("Sponsor logo", "Company name") so the
 * page has its real shape. No sponsor is confirmed yet (see AGENTS.md);
 * replace these before launch. An empty tier is skipped, and with every tier
 * empty the page shows "coming soon".
 */
const placeholder = (count: number): Sponsor[] =>
	Array.from({ length: count }, () => ({ name: "Company name" }));

export const SPONSORS: Record<SponsorTier, Sponsor[]> = {
	platinum: placeholder(2),
	gold: placeholder(3),
	silver: placeholder(6),
	community: placeholder(7),
};
