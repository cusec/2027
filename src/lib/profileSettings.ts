import { OPPORTUNITY_OPTIONS, TECH_AREA_OPTIONS, WORK_LOCATION_OPTIONS, WORK_ARRANGEMENT_OPTIONS, PRONOUN_OPTIONS, TRANSPORT_OPTIONS, YES_NO_UNSURE_OPTIONS, CONNECT_SCHOOL_OPTIONS, isValidLink, type LinkField } from "./ticketWizardOptions";

export const AVATAR_POSES = ["default", "book", "laptop", "speaker", "shock", "erm"] as const;
export type AvatarPose = typeof AVATAR_POSES[number];
export interface SponsorPreferences {
  sponsorConsent: boolean;
  opportunities: string[]; opportunitiesOther: string;
  techAreas: string[]; techAreasOther: string;
  workLocations: string[]; workArrangement: string;
  linkedinUrl: string; githubUrl: string; portfolioUrl: string;
}
export interface TravelPlans {
  transport: string; transportOther: string; delegation: string; delegationSchool: string; delegationOther: string;
  connectWithSchool: string; travelFunding: string; accommodation: string;
}
export interface ProfileData {
  name: string; email: string; role: string; firstName: string; lastName: string;
  pronoun: string; school: string; fieldOfStudy: string; graduation: string; avatarPose: AvatarPose;
  isSponsor: boolean; isVip: boolean;
  ticketName: string; orderId: string | null; ticketId: string | null; ticketRomanNumeral: string | null;
  huntOpen: boolean; points: number; found: number; total: number; rank: number | null;
  travel: { travelCountry: string; travelRegion: string; travelCity: string; postalCode: string };
  travelPlans: TravelPlans;
  sponsor: SponsorPreferences; resumeRoast: boolean;
  resume: { fileName: string; size: number; uploadedAt: string | null } | null;
}

type Parsed = { ok: true; group: string; fields: Record<string, unknown> } | { ok: false; field: string };
/** Explicit per-editor allowlists: never accept ticket, email, user id or progress fields. */
export function parseProfileSettings(body: unknown): Parsed {
  if (!body || typeof body !== "object") return { ok: false, field: "body" };
  const b = body as Record<string, unknown>;
  if (b.group === "avatar") {
    return AVATAR_POSES.includes(b.avatarPose as AvatarPose)
      ? { ok: true, group: "avatar", fields: { avatarPose: b.avatarPose } } : { ok: false, field: "avatarPose" };
  }
  if (b.group === "travel") {
    const fields: Record<string, string> = {};
    for (const [key, options] of [["transport", TRANSPORT_OPTIONS], ["delegation", YES_NO_UNSURE_OPTIONS], ["connectWithSchool", CONNECT_SCHOOL_OPTIONS], ["travelFunding", YES_NO_UNSURE_OPTIONS], ["accommodation", YES_NO_UNSURE_OPTIONS]] as const) {
      if (typeof b[key] !== "string" || (b[key] && !options.some(o => o.value === b[key]))) return { ok: false, field: key };
      fields[key] = b[key];
    }
    for (const key of ["transportOther", "delegationSchool", "delegationOther", "travelCountry", "travelRegion", "travelCity", "postalCode"] as const) {
      if (typeof b[key] !== "string" || b[key].length > 200) return { ok: false, field: key };
      fields[key] = b[key].trim();
    }
    return { ok: true, group: "travel", fields };
  }
  if (b.group === "resume") {
    return typeof b.resumeRoast === "boolean" ? { ok: true, group: "resume", fields: { resumeRoast: b.resumeRoast } } : { ok: false, field: "resumeRoast" };
  }
  if (b.group === "account") {
    const fields: Record<string, string> = {};
    for (const key of ["firstName", "lastName"] as const) {
      if (typeof b[key] !== "string" || !b[key].trim() || b[key].trim().length > 100) return { ok: false, field: key };
      fields[key] = b[key].trim();
    }
    if (typeof b.pronoun !== "string" || (b.pronoun && !PRONOUN_OPTIONS.some(o => o.value === b.pronoun))) return { ok: false, field: "pronoun" };
    fields.pronoun = b.pronoun;
    return { ok: true, group: "account", fields };
  }
  if (b.group !== "sponsor") return { ok: false, field: "group" };
  if (typeof b.sponsorConsent !== "boolean") return { ok: false, field: "sponsorConsent" };
  const fields: Record<string, unknown> = { sponsorConsent: b.sponsorConsent };
  for (const [key, options, max] of [["opportunities", OPPORTUNITY_OPTIONS, 10], ["techAreas", TECH_AREA_OPTIONS, 5], ["workLocations", WORK_LOCATION_OPTIONS, 5]] as const) {
    const v = b[key];
    if (!Array.isArray(v) || v.length > max || v.some(x => typeof x !== "string" || !options.some(o => o.value === x))) return { ok: false, field: key };
    if (key === "opportunities" && v.includes("not-looking") && v.length > 1) return { ok: false, field: key };
    fields[key] = [...new Set(v)];
  }
  if (typeof b.workArrangement !== "string" || (b.workArrangement && !WORK_ARRANGEMENT_OPTIONS.some(o => o.value === b.workArrangement))) return { ok: false, field: "workArrangement" };
  fields.workArrangement = b.workArrangement;
  for (const key of ["opportunitiesOther", "techAreasOther", "linkedinUrl", "githubUrl", "portfolioUrl"] as const) {
    const v = b[key];
    if (typeof v !== "string" || v.length > (key.endsWith("Url") ? 500 : 200)) return { ok: false, field: key };
    if (key.endsWith("Url") && v.trim() && !isValidLink(key as LinkField, v.trim())) return { ok: false, field: key };
    fields[key] = v.trim();
  }
  return { ok: true, group: "sponsor", fields };
}

/** Sponsor access comes from trusted roles. VIP is supplied separately from the verified database entitlement. */
export function getProfileEntitlements(roles: string[]) {
  return { isSponsor: roles.includes("Sponsor"), isVip: false };
}
