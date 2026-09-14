import type { DemographicInfo, ProfileAnswers } from "@/lib/interface";
import type { SectionId } from "@/lib/ticketWizardOptions";

// Client-side helpers shared by the Profile, Interests and post-purchase forms.

export const EMPTY_ANSWERS: ProfileAnswers = {
  firstName: "",
  lastName: "",
  primaryEmail: "",
  secondaryEmail: "",
  pronoun: "",
  pronounOther: "",
  attendeeType: "",
  attendeeTypeOther: "",
  school: "",
  schoolOther: "",
  campus: "",
  fieldOfStudy: "",
  fieldOfStudyOther: "",
  credential: "",
  credentialOther: "",
  studyLevel: "",
  studyLevelOther: "",
  expectedGraduation: "",
  internships: "",
  currentRole: "",
  currentRoleOther: "",
  experience: "",
  travelCountry: "CA",
  travelRegion: "",
  travelCity: "",
  attendReasons: [],
  attendReasonsOther: "",
  successMeasures: [],
  successMeasuresOther: "",
  opportunities: [],
  opportunitiesOther: "",
  techAreas: [],
  techAreasOther: "",
  workLocations: [],
  workArrangement: "",
  transport: "",
  transportOther: "",
  delegation: "",
  delegationSchool: "",
  delegationOther: "",
  connectWithSchool: "",
  travelFunding: "",
  accommodation: "",
  heardFrom: "",
  heardFromOther: "",
  convincedBy: "",
  convincedByOther: "",
  attended: [],
  sessionFormats: [],
  sessionFormatsOther: "",
  communityInvolvement: [],
  communityInvolvementOther: "",
  communityProject: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  sponsorConsent: false,
};

/** Saved values over the blanks, ignoring anything the form doesn't own. */
export function answersFrom(saved: Partial<DemographicInfo> | null): ProfileAnswers {
  const answers = { ...EMPTY_ANSWERS };
  if (!saved) return answers;
  for (const key of Object.keys(EMPTY_ANSWERS) as (keyof ProfileAnswers)[]) {
    const value = saved[key];
    if (value !== undefined && value !== null && value !== "") {
      (answers as Record<string, unknown>)[key] = value;
    }
  }
  return answers;
}

export type SaveResult = { ok: true } | { ok: false; field?: string };

/** Saves one section. On a rejected answer, `field` names the offending input. */
export async function saveSection(
  section: SectionId,
  answers: Partial<ProfileAnswers>
): Promise<SaveResult> {
  try {
    const res = await fetch("/api/demographics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, answers }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, field: typeof data?.field === "string" ? data.field : undefined };
  } catch {
    return { ok: false };
  }
}

/** Moves focus to the input the server rejected, when it is on the page. */
export function focusField(field?: string) {
  if (!field) return;
  const el = document.getElementById(field);
  el?.focus();
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
