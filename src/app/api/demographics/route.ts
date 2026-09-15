import { NextResponse } from "next/server";
import { Country, State } from "country-state-city";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User, DemographicInfo } from "@/lib/models";
import { DELEGATION_SCHOOLS, findInstitution } from "@/lib/institutions";
import {
  ATTEND_REASON_OPTIONS,
  ATTENDED_OPTIONS,
  ATTENDEE_TYPE_OPTIONS,
  COMMUNITY_OPTIONS,
  CONNECT_SCHOOL_OPTIONS,
  CONVINCED_BY_OPTIONS,
  CREDENTIAL_OPTIONS,
  CURRENT_ROLE_OPTIONS,
  EXPERIENCE_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
  FIRST_TIME,
  GRADUATION_OPTIONS,
  HEARD_FROM_OPTIONS,
  INDEPENDENT_DELEGATION,
  INTEREST_SECTIONS,
  INTERNSHIP_COUNT_OPTIONS,
  LIMITS,
  NOT_LOOKING,
  OPPORTUNITY_OPTIONS,
  OTHER,
  PRONOUN_OPTIONS,
  SCHOOL_TYPES,
  SECTIONS,
  SESSION_FORMAT_OPTIONS,
  STUDIES_TYPES,
  STUDY_LEVEL_OPTIONS,
  SUCCESS_OPTIONS,
  TECH_AREA_OPTIONS,
  TEXT_MAX,
  TRANSPORT_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  WORK_LOCATION_OPTIONS,
  WORK_TYPES,
  YES_NO_UNSURE_OPTIONS,
  isValidLink,
  normalizeUrl,
  type Option,
  type SectionId,
} from "@/lib/ticketWizardOptions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

class InvalidAnswer extends Error {
  constructor(public field: string) {
    super(`invalid ${field}`);
  }
}

type Answers = Record<string, unknown>;
type Update = Record<string, string | string[] | boolean | Date | null>;

const text = (answers: Answers, field: string, required = false): string => {
  const raw = answers[field];
  const value = typeof raw === "string" ? raw.trim().slice(0, TEXT_MAX) : "";
  if (required && !value) throw new InvalidAnswer(field);
  return value;
};

const email = (answers: Answers, field: string, required = false): string => {
  const value = text(answers, field, required).toLowerCase();
  if (value && !EMAIL_RE.test(value)) throw new InvalidAnswer(field);
  return value;
};

const one = (answers: Answers, field: string, options: Option[], required = false): string => {
  const value = text(answers, field);
  if (!value) {
    if (required) throw new InvalidAnswer(field);
    return "";
  }
  if (!options.some((o) => o.value === value)) throw new InvalidAnswer(field);
  return value;
};

const many = (
  answers: Answers,
  field: string,
  options: Option[],
  max?: number,
  required = false
): string[] => {
  const raw = answers[field] ?? [];
  if (!Array.isArray(raw)) throw new InvalidAnswer(field);
  const values = [...new Set(raw.filter((v): v is string => typeof v === "string"))];
  if (values.some((v) => !options.some((o) => o.value === v))) throw new InvalidAnswer(field);
  if (max !== undefined && values.length > max) throw new InvalidAnswer(field);
  if (required && values.length === 0) throw new InvalidAnswer(field);
  return values;
};

const oneWithOther = (
  answers: Answers,
  field: string,
  options: Option[],
  required = false
): Update => {
  const value = one(answers, field, options, required);
  const other = value === OTHER ? text(answers, `${field}Other`, required) : "";
  return { [field]: value, [`${field}Other`]: other };
};

const manyWithOther = (
  answers: Answers,
  field: string,
  options: Option[],
  max?: number,
  required = false
): Update => {
  const values = many(answers, field, options, max, required);
  const other = values.includes(OTHER) ? text(answers, `${field}Other`, required) : "";
  return { [field]: values, [`${field}Other`]: other };
};

function basics(answers: Answers): Update {
  return {
    firstName: text(answers, "firstName", true),
    lastName: text(answers, "lastName", true),
    primaryEmail: email(answers, "primaryEmail", true),
    secondaryEmail: email(answers, "secondaryEmail"),
    ...oneWithOther(answers, "pronoun", PRONOUN_OPTIONS, true),
    ...oneWithOther(answers, "attendeeType", ATTENDEE_TYPE_OPTIONS, true),
  };
}

function background(answers: Answers, attendeeType: string): Update {
  const update: Update = {
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
  };

  if (SCHOOL_TYPES.includes(attendeeType)) {
    const school = text(answers, "school", true);
    if (school === OTHER) {
      update.school = OTHER;
      update.schoolOther = text(answers, "schoolOther", true);
    } else {
      const institution = findInstitution(school);
      if (!institution) throw new InvalidAnswer("school");
      update.school = school;
      const campus = text(answers, "campus");
      if (campus && !institution.campuses?.includes(campus)) throw new InvalidAnswer("campus");
      update.campus = institution.campuses ? campus : "";
    }
  }

  if (STUDIES_TYPES.includes(attendeeType)) {
    Object.assign(
      update,
      oneWithOther(answers, "fieldOfStudy", FIELD_OF_STUDY_OPTIONS, true),
      oneWithOther(answers, "credential", CREDENTIAL_OPTIONS, true),
      oneWithOther(answers, "studyLevel", STUDY_LEVEL_OPTIONS, true)
    );
    update.expectedGraduation = one(answers, "expectedGraduation", GRADUATION_OPTIONS, true);
    update.internships = one(answers, "internships", INTERNSHIP_COUNT_OPTIONS, true);
  }

  if (WORK_TYPES.includes(attendeeType)) {
    Object.assign(update, oneWithOther(answers, "currentRole", CURRENT_ROLE_OPTIONS, true));
    update.experience = one(answers, "experience", EXPERIENCE_OPTIONS, true);
  }

  const country = text(answers, "travelCountry", true).toUpperCase();
  if (!Country.getCountryByCode(country)) throw new InvalidAnswer("travelCountry");
  const hasRegions = State.getStatesOfCountry(country).length > 0;
  const region = text(answers, "travelRegion", hasRegions).toUpperCase();
  if (region && !State.getStateByCodeAndCountry(region, country)) {
    throw new InvalidAnswer("travelRegion");
  }
  update.travelCountry = country;
  update.travelRegion = region;
  update.travelCity = text(answers, "travelCity", true);

  return update;
}

function goals(answers: Answers): Update {
  const opportunities = manyWithOther(answers, "opportunities", OPPORTUNITY_OPTIONS, undefined, true);
  const picked = opportunities.opportunities as string[];
  const looking = !picked.includes(NOT_LOOKING);
  if (!looking && picked.length > 1) throw new InvalidAnswer("opportunities");

  return {
    ...manyWithOther(answers, "attendReasons", ATTEND_REASON_OPTIONS, LIMITS.attendReasons, true),
    ...manyWithOther(answers, "successMeasures", SUCCESS_OPTIONS, LIMITS.successMeasures, true),
    ...opportunities,
    ...manyWithOther(answers, "techAreas", TECH_AREA_OPTIONS, LIMITS.techAreas, true),
    workLocations: looking
      ? many(answers, "workLocations", WORK_LOCATION_OPTIONS, LIMITS.workLocations, true)
      : [],
    workArrangement: looking ? one(answers, "workArrangement", WORK_ARRANGEMENT_OPTIONS, true) : "",
  };
}

function travel(answers: Answers): Update {
  const delegation = one(answers, "delegation", YES_NO_UNSURE_OPTIONS, true);

  let delegationSchool = "";
  let delegationOther = "";
  if (delegation === "yes") {
    delegationSchool = text(answers, "delegationSchool", true);
    const known =
      !delegationSchool ||
      delegationSchool === OTHER ||
      delegationSchool === INDEPENDENT_DELEGATION ||
      DELEGATION_SCHOOLS.includes(delegationSchool);
    if (!known) throw new InvalidAnswer("delegationSchool");
    if (delegationSchool === OTHER) delegationOther = text(answers, "delegationOther", true);
  }

  return {
    ...oneWithOther(answers, "transport", TRANSPORT_OPTIONS, true),
    delegation,
    delegationSchool,
    delegationOther,
    connectWithSchool: one(answers, "connectWithSchool", CONNECT_SCHOOL_OPTIONS, true),
    travelFunding: one(answers, "travelFunding", YES_NO_UNSURE_OPTIONS, true),
    accommodation: one(answers, "accommodation", YES_NO_UNSURE_OPTIONS, true),
  };
}

function experience(answers: Answers): Update {
  const attended = many(answers, "attended", ATTENDED_OPTIONS, undefined, true);
  if (attended.includes(FIRST_TIME) && attended.length > 1) throw new InvalidAnswer("attended");

  return {
    ...oneWithOther(answers, "heardFrom", HEARD_FROM_OPTIONS, true),
    ...oneWithOther(answers, "convincedBy", CONVINCED_BY_OPTIONS, true),
    attended,
    ...manyWithOther(answers, "sessionFormats", SESSION_FORMAT_OPTIONS, LIMITS.sessionFormats, true),
    ...manyWithOther(answers, "communityInvolvement", COMMUNITY_OPTIONS, undefined, true),
    communityProject: text(answers, "communityProject"),
  };
}

function links(answers: Answers, consentedBefore: boolean): Update {
  const update: Update = {};
  for (const field of ["linkedinUrl", "githubUrl", "portfolioUrl"] as const) {
    const value = text(answers, field);
    if (!isValidLink(field, value)) throw new InvalidAnswer(field);
    update[field] = normalizeUrl(value);
  }
  const consent = answers.sponsorConsent === true;
  update.sponsorConsent = consent;
  if (consent && !consentedBefore) update.sponsorConsentAt = new Date();
  if (!consent) update.sponsorConsentAt = null;
  return update;
}

export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const demographics = await DemographicInfo.findOne({ user: user._id })
    .select("-resumePublicId")
    .lean();
  return NextResponse.json({ demographics: demographics ?? null });
}

export async function PUT(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { section?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const section = body.section as SectionId;
  if (!SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }
  const answers =
    body.answers && typeof body.answers === "object" ? (body.answers as Answers) : {};

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await DemographicInfo.findOne({ user: user._id })
    .select("attendeeType sponsorConsent sections")
    .lean<{
      attendeeType?: string;
      sponsorConsent?: boolean;
      sections?: Partial<Record<SectionId, Date | null>>;
    }>();

  if (section === "background" && !existing?.sections?.basics) {
    return NextResponse.json({ error: "Save the basics first" }, { status: 409 });
  }

  let update: Update;
  try {
    switch (section) {
      case "basics":
        update = basics(answers);
        break;
      case "background":
        update = background(answers, existing?.attendeeType ?? "");
        break;
      case "goals":
        update = goals(answers);
        break;
      case "travel":
        update = travel(answers);
        break;
      case "experience":
        update = experience(answers);
        break;
      case "links":
        update = links(answers, Boolean(existing?.sponsorConsent));
        break;
    }
  } catch (error) {
    if (error instanceof InvalidAnswer) {
      return NextResponse.json({ error: "invalid-answer", field: error.field }, { status: 400 });
    }
    throw error;
  }

  const saved = await DemographicInfo.findOneAndUpdate(
    { user: user._id },
    { $set: { user: user._id, ...update, [`sections.${section}`]: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .select("sections")
    .lean<{ sections?: Partial<Record<SectionId, Date | null>> }>();

  user.hasSeenIntro = true;
  const done = (id: SectionId) => Boolean(saved?.sections?.[id]);
  if (!["purchase", "completed"].includes(user.ticketWizard.currentStep)) {
    user.ticketWizard.currentStep =
      done("basics") && done("background")
        ? INTEREST_SECTIONS.every(done)
          ? "purchase"
          : "interests"
        : "profile";
  }
  await user.save();

  console.log(`Profile section "${section}" saved for user ${user._id}`);

  return NextResponse.json({ success: true, sections: saved?.sections ?? {} });
}
