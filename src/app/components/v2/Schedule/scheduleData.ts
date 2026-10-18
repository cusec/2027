import type { Localized } from "@/lib/localized";

/**
 * Drives the block colour and the legend. `break` is the dashed, see-through
 * block used for registration and meal breaks.
 */
export type SessionCategory = "keynote" | "talk" | "workshop" | "career" | "community" | "break";

export const CATEGORIES: SessionCategory[] = [
	"keynote",
	"talk",
	"workshop",
	"career",
	"community",
	"break",
];

export type Room = { id: string; name: Localized };

export type Session = {
	/** 24-hour Montréal time, "HH:MM" */
	start: string;
	end: string;
	title: Localized;
	/** the second line - speaker, host, panelists, "Sponsor booths" */
	detail?: Localized;
	/** a room id from the day's `rooms`, or "all" to span every column */
	room: string;
	category: SessionCategory;
	/** a headshot tile in the block's corner; `{}` draws the empty tile */
	portrait?: { src?: string };
};

export type AfterHoursEvent = {
	start: string;
	/** "24:00" or later for anything that runs to or past midnight */
	end: string;
	title: Localized;
	location: Localized;
};

export type ScheduleDay = {
	/** ISO date, "2027-01-07" */
	date: string;
	rooms: Room[];
	sessions: Session[];
	afterHours?: {
		/** when the evening programme opens, for the "7 PM to midnight" line */
		from: string;
		events: AfterHoursEvent[];
	};
};

const MAIN: Room = { id: "main", name: { "en-CA": "Main stage", "fr-CA": "Scène principale" } };
const FAIR: Room = {
	id: "fair",
	name: { "en-CA": "Career fair hall", "fr-CA": "Salle du salon de l’emploi" },
};
const WORKSHOP: Room = {
	id: "workshop",
	name: { "en-CA": "Workshop room", "fr-CA": "Salle des ateliers" },
};

const MAIN_STAGE: Localized = MAIN.name;
const OFF_SITE: Localized = { "en-CA": "Off-site venue", "fr-CA": "Lieu hors site" };
const BOOTHS: Localized = { "en-CA": "Sponsor booths", "fr-CA": "Kiosques des commanditaires" };
const CAREER_FAIR: Localized = { "en-CA": "Career fair", "fr-CA": "Salon de l’emploi" };
const VIP_FAIR: Localized = { "en-CA": "VIP career fair", "fr-CA": "Salon de l’emploi VIP" };
const BREAK: Localized = { "en-CA": "Mid-day break", "fr-CA": "Pause du midi" };

/*
 * PLACEHOLDER - Thursday and Friday mirror the Figma frames session for
 * session ("Keynote title", "Speaker name"); Saturday only fills its 10 AM to
 * 5:15 PM span so the tab has something in it. Nothing here is a confirmed
 * session - replace it all with the real programme before launch. Leave
 * SCHEDULE empty and the page shows "coming soon" instead.
 */
export const SCHEDULE: ScheduleDay[] = [
	{
		date: "2027-01-07",
		rooms: [MAIN, FAIR],
		sessions: [
			{
				start: "08:30",
				end: "09:25",
				room: "all",
				category: "break",
				title: { "en-CA": "Registration", "fr-CA": "Inscription" },
				detail: { "en-CA": "Registration desk", "fr-CA": "Comptoir d’inscription" },
			},
			{
				start: "09:30",
				end: "10:00",
				room: "main",
				category: "keynote",
				title: { "en-CA": "Opening ceremony", "fr-CA": "Cérémonie d’ouverture" },
			},
			{
				start: "10:15",
				end: "11:10",
				room: "main",
				category: "keynote",
				title: "Keynote title",
				detail: "Speaker name · Role, Company",
				portrait: {},
			},
			{ start: "11:20", end: "12:05", room: "main", category: "talk", title: "Panel title", detail: "Panelist names" },
			{ start: "12:15", end: "13:25", room: "all", category: "break", title: BREAK },
			{ start: "13:30", end: "14:00", room: "main", category: "talk", title: "Talk title", detail: "Speaker name" },
			{ start: "14:10", end: "14:45", room: "main", category: "workshop", title: "Workshop title, part 1", detail: "Host name" },
			{ start: "14:55", end: "15:45", room: "main", category: "workshop", title: "Workshop title, part 2", detail: "Host name · Company" },
			{ start: "15:55", end: "16:20", room: "main", category: "talk", title: "Panel title", detail: "Panelist names" },
			{ start: "16:30", end: "17:00", room: "main", category: "talk", title: "Talk title", detail: "Speaker name" },
			{ start: "13:45", end: "15:45", room: "fair", category: "career", title: CAREER_FAIR, detail: BOOTHS },
			{ start: "16:00", end: "17:00", room: "fair", category: "career", title: VIP_FAIR, detail: BOOTHS },
		],
		afterHours: {
			from: "19:00",
			events: [
				{ start: "20:45", end: "23:45", title: { "en-CA": "Game night", "fr-CA": "Soirée jeux" }, location: MAIN_STAGE },
				{ start: "21:45", end: "22:15", title: { "en-CA": "Trivia", "fr-CA": "Quiz" }, location: MAIN_STAGE },
			],
		},
	},
	{
		date: "2027-01-08",
		rooms: [MAIN, FAIR, WORKSHOP],
		sessions: [
			{
				start: "09:00",
				end: "09:55",
				room: "main",
				category: "keynote",
				title: "Keynote title",
				detail: "Speaker name · Role, Company",
				portrait: {},
			},
			{ start: "10:05", end: "10:50", room: "main", category: "workshop", title: "Workshop title", detail: "Host name · Company" },
			{
				start: "11:00",
				end: "11:55",
				room: "main",
				category: "keynote",
				title: "Keynote title",
				detail: "Speaker name · Role, Company",
				portrait: {},
			},
			{ start: "12:05", end: "13:15", room: "all", category: "break", title: BREAK },
			{ start: "13:25", end: "13:55", room: "main", category: "talk", title: "Talk title", detail: "Speaker name" },
			{ start: "14:25", end: "15:10", room: "main", category: "workshop", title: "Workshop title", detail: "Host name · Company" },
			{ start: "15:20", end: "16:15", room: "main", category: "talk", title: "Panel title", detail: "Panelist names" },
			{ start: "16:30", end: "17:00", room: "main", category: "talk", title: "Talk title", detail: "Speaker name" },
			{ start: "10:05", end: "11:30", room: "fair", category: "career", title: CAREER_FAIR, detail: BOOTHS },
			{
				start: "11:35",
				end: "12:00",
				room: "fair",
				category: "community",
				title: { "en-CA": "Speed networking", "fr-CA": "Réseautage éclair" },
			},
			{ start: "13:45", end: "14:45", room: "fair", category: "career", title: CAREER_FAIR, detail: BOOTHS },
			{ start: "15:30", end: "16:30", room: "fair", category: "career", title: VIP_FAIR, detail: BOOTHS },
			{ start: "14:05", end: "15:35", room: "workshop", category: "community", title: "Dev's Den", detail: "Build-a-thon" },
		],
		afterHours: {
			from: "19:00",
			events: [
				{ start: "19:00", end: "23:45", title: { "en-CA": "Pub night", "fr-CA": "Soirée pub" }, location: OFF_SITE },
				{
					start: "20:00",
					end: "21:00",
					title: { "en-CA": "Late-night demos", "fr-CA": "Démos de fin de soirée" },
					location: MAIN_STAGE,
				},
				{ start: "21:10", end: "23:45", title: { "en-CA": "Karaoke night", "fr-CA": "Soirée karaoké" }, location: MAIN_STAGE },
			],
		},
	},
	{
		date: "2027-01-09",
		rooms: [MAIN, WORKSHOP],
		sessions: [
			{
				start: "10:00",
				end: "10:55",
				room: "main",
				category: "keynote",
				title: "Keynote title",
				detail: "Speaker name · Role, Company",
				portrait: {},
			},
			{ start: "11:05", end: "11:35", room: "main", category: "talk", title: "Talk title", detail: "Speaker name" },
			{ start: "10:30", end: "11:45", room: "workshop", category: "workshop", title: "Workshop title", detail: "Host name · Company" },
			{ start: "12:00", end: "13:00", room: "all", category: "break", title: BREAK },
			{ start: "13:10", end: "13:55", room: "main", category: "talk", title: "Panel title", detail: "Panelist names" },
			{ start: "13:10", end: "14:30", room: "workshop", category: "workshop", title: "Workshop title", detail: "Host name · Company" },
			{ start: "14:10", end: "14:40", room: "main", category: "talk", title: "Talk title", detail: "Speaker name" },
			{
				start: "15:00",
				end: "15:55",
				room: "main",
				category: "keynote",
				title: "Keynote title",
				detail: "Speaker name · Role, Company",
				portrait: {},
			},
			{
				start: "16:15",
				end: "17:15",
				room: "main",
				category: "keynote",
				title: { "en-CA": "Closing ceremony", "fr-CA": "Cérémonie de clôture" },
			},
		],
	},
];
