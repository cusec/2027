export interface Position {
  x: string | number; // vh/vw format like "10vw" or "20vh"
  y: string | number; // vh/vw format like "15vh" or "25vw"
}

export interface Size {
  width: string; // vh/vw format like "12vw"
  height: string; // vh/vw format like "8vh"
}

export interface Stat {
  id: string;
  name: string;
  content: string;
  description: string;
  image: string;
  position: Position;
  size: Size;
  font_sizes?: {
    [key: string]: string;
  };
}

export interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export interface Auth0User {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  linked_email?: string | undefined;
  "cusec/roles"?: string[];
}

export interface TicketWizardProgress {
  currentStep: "demographics" | "avatar" | "purchase" | "completed";
  avatarCompletedAt?: string | null;
  purchasedTicketTypeId?: string | null;
  purchasedTicketName?: string | null;
}

/**
 * One acquisition touch - re-exported from the canonical definition in
 * `attribution.ts` so there is a single source of truth for the shape (the
 * Mongoose schema in models.ts mirrors it).
 */
export type { AttributionTouch } from "./attribution";
import type { AttributionTouch } from "./attribution";

export interface UserAttribution {
  firstTouch: AttributionTouch | null;
  latestTouch: AttributionTouch | null;
}

export interface DbUser {
  _id: string;
  email: string;
  name?: string;
  linked_email?: string | undefined;
  discord_handle?: string | null;
  active: boolean;
  points: number;
  claimedItems: string[];
  collectibles: string[];
  shopPrizes: string[]; // Array of ShopItem IDs that have been redeemed for this user
  claim_attempts?: ClaimAttempt[];
  hasSeenIntro?: boolean;
  personalityType?: string | null;
  attribution?: UserAttribution | null;
  ticketWizard?: TicketWizardProgress;
}

export interface ClaimAttempt {
  identifier: string;
  success: boolean;
  timestamp: string;
  item_id?: string;
}

export interface HuntItem {
  _id: string;
  name: string;
  description: string;
  identifier: string;
  points: number;
  maxClaims: number | null;
  claimCount: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  collectibles: string[];
  createdAt: string;
  updatedAt: string;
  qrCodes?: {
    localhost?: string;
    production?: string;
    staging?: string;
  };
}

export interface HuntItemFormData {
  name: string;
  description: string;
  identifier: string;
  points: number;
  maxClaims: number | null;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  collectibles: string[];
}

export interface ShopItem {
  count?: number; // For internal use, not stored in DB, Just for displaying quantity in inventory
  _id: string;
  name: string;
  description: string;
  cost: number;
  discountedCost: number | null;
  limited: boolean;
  remaining: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  imageData?: string; // Base64 encoded image data (optional)
  imageContentType?: string; // MIME type (optional)
  createdAt?: string;
  updatedAt?: string;
  claimCount: number;
}

export interface ShopItemFormData {
  name: string;
  description: string;
  cost: number;
  discountedCost: number | null;
  limited: boolean;
  remaining: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  imageData?: string; // Base64 encoded image data (optional)
  imageContentType?: string; // MIME type (optional)
}

export interface Notice {
  _id: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoticeFormData {
  title: string;
  description: string;
}

export interface Collectible {
  _id: string;
  name: string;
  description: string;
  cost: number;
  discountedCost: number | null;
  purchasable: boolean;
  limited: boolean;
  remaining: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  imageData?: string; // Base64 encoded image data (optional)
  imageContentType?: string; // MIME type (optional)
  createdAt?: string;
  updatedAt?: string;
  claimCount: number;
}

export interface CollectibleFormData {
  name: string;
  description: string;
  cost: number;
  discountedCost: number | null;
  purchasable: boolean;
  limited: boolean;
  remaining: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  imageData?: string; // Base64 encoded image data (optional)
  imageContentType?: string; // MIME type (optional)
}

export interface Day {
  _id?: string;
  day: string;
  date: string;
  timestamp: number; // Numeric format: YYYYMMDD (e.g., 20260101 for Jan 1, 2026)
  schedule: ScheduleItem[];
}

export interface ScheduleItem {
  _id?: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  detailedDescription?: string;
  location?: string;
  track: "A" | "B" | "C" | "AB" | "BC";
  color?: "primary" | "secondary" | "accent" | "sunset" | "sea" | "white";
}

export type Sponsor = {
  image: string;
  link: string;
};

export interface Speaker {
  name: string;
  pronouns?: string;
  title?: string;
  talkTitle?: string;
  talkDescription?: string;
  bio: string;
  image: string;
  socials?: {
    linkedin?: string;
    x?: string;
    github?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
    bsky?: string;
    website?: string;
    tiktok?: string;
    mastodon?: string;
    misc?: string;
  };
}

export interface TeamMember {
  name: string;
  pronouns: string;
  teamRole: string;
  professionalTitle?: string;
  primaryImage: string;
  secondaryImage?: string;
  infoTitle: string;
  infoDescription: string;
  education: {
    major: string;
    institution: string;
    logo: string;
  };
  socials?: {
    linkedin?: string;
    x?: string;
    github?: string;
    website?: string;
  };
}

export interface RegisteredUser {
  name: string;
  linkedEmail: string;
  studentEmail?: string;
  personalEmail?: string;
  isLinked: boolean;
}

export interface DemographicInfo {
  _id?: string;
  user: string;
  sections: {
    basics: string | null;
    background: string | null;
    goals: string | null;
    travel: string | null;
    experience: string | null;
    links: string | null;
  };

  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string;
  pronoun: string;
  pronounOther: string;
  attendeeType: string;
  attendeeTypeOther: string;

  school: string;
  schoolOther: string;
  campus: string;
  fieldOfStudy: string;
  fieldOfStudyOther: string;
  credential: string;
  credentialOther: string;
  studyLevel: string;
  studyLevelOther: string;
  expectedGraduation: string;
  internships: string;

  currentRole: string;
  currentRoleOther: string;
  experience: string;

  travelCountry: string;
  travelRegion: string;
  travelCity: string;

  attendReasons: string[];
  attendReasonsOther: string;
  successMeasures: string[];
  successMeasuresOther: string;
  opportunities: string[];
  opportunitiesOther: string;
  techAreas: string[];
  techAreasOther: string;
  workLocations: string[];
  workArrangement: string;

  transport: string;
  transportOther: string;
  delegation: string;
  delegationSchool: string;
  delegationOther: string;
  connectWithSchool: string;
  travelFunding: string;
  accommodation: string;
  heardFrom: string;
  heardFromOther: string;
  convincedBy: string;
  convincedByOther: string;
  attended: string[];
  sessionFormats: string[];
  sessionFormatsOther: string;
  communityInvolvement: string[];
  communityInvolvementOther: string;
  communityProject: string;

  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  sponsorConsent: boolean;
  sponsorConsentAt?: string | null;
  resumeFileName?: string;
  resumeSize?: number;
  resumeUploadedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type ProfileAnswers = Omit<
  DemographicInfo,
  | "_id"
  | "user"
  | "sections"
  | "sponsorConsentAt"
  | "resumeFileName"
  | "resumeSize"
  | "resumeUploadedAt"
  | "createdAt"
  | "updatedAt"
>;

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  eventName: string;
  mode: "individual" | "group";
  points: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  maxSubmissions: number | null;
  submissionCount: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChallengeFormData {
  title: string;
  description: string;
  eventName: string;
  mode: "individual" | "group";
  points: number;
  active: boolean;
  activationStart: string | null;
  activationEnd: string | null;
  maxSubmissions: number | null;
}

export interface SubmissionTeamMember {
  _id: string;
  name?: string;
  email?: string;
}

/** A team in the browse list: enough to pick one with space, nothing more. */
export interface TeamSummary {
  _id: string;
  challengeId: string;
  name: string;
  memberCount: number;
}

/** The caller's own team - the only one whose roster and code they receive. */
export interface SubmissionTeam extends TeamSummary {
  members: SubmissionTeamMember[];
  createdBy?: string;
  joinCode: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  _id: string;
  // Populated to a Challenge when the admin review endpoint expands it.
  challengeId: string | Challenge;
  userId: string;
  userEmail: string;
  // Populated to a Team on group submissions.
  teamId?: string | SubmissionTeam | null;
  url: string;
  notes: string;
  status: SubmissionStatus;
  pointsAwarded: number;
  createdAt?: string;
  updatedAt?: string;
}
