import connectMongoDB from "./mongodb";
import { User, RegisteredUser, DemographicInfo } from "./models";
import {
  INTEREST_SECTIONS,
  REQUIRED_SECTIONS,
  needsTravelLocation,
  type SectionId,
} from "./ticketWizardOptions";

export type WizardStep = "profile" | "interests" | "purchase" | "completed";

export interface WizardStatus {
  profileComplete: boolean;
  interestsComplete: boolean;
  purchaseComplete: boolean;
  linkedEmail: string | null;
  purchasedTicketName: string | null;
}

interface LeanWizardUser {
  _id: unknown;
  linked_email?: string;
  ticketWizard?: {
    purchasedTicketName?: string | null;
  };
}

type SavedSections = Partial<Record<SectionId, Date | string | null>>;

export async function getWizardStatus(email: string): Promise<WizardStatus> {
  await connectMongoDB();

  const user = await User.findOne({ email }).lean<LeanWizardUser>();
  if (!user) {
    return {
      profileComplete: false,
      interestsComplete: false,
      purchaseComplete: false,
      linkedEmail: null,
      purchasedTicketName: null,
    };
  }

  const profile = await DemographicInfo.findOne({ user: user._id })
    .select("sections")
    .lean<{ sections?: SavedSections }>();
  const saved = (id: SectionId) => Boolean(profile?.sections?.[id]);

  let purchaseComplete = false;
  if (user.linked_email) {
    const registeredUser = await RegisteredUser.findOne({
      linkedEmail: user.linked_email,
      isLinked: true,
    }).lean();
    purchaseComplete = !!registeredUser;
  }

  return {
    profileComplete: REQUIRED_SECTIONS.every(saved),
    interestsComplete: INTEREST_SECTIONS.every(saved),
    purchaseComplete,
    linkedEmail: user.linked_email ?? null,
    purchasedTicketName: purchaseComplete
      ? (user.ticketWizard?.purchasedTicketName ?? null)
      : null,
  };
}

export interface TravelLocation {
  travelCountry: string;
  travelRegion: string;
  travelCity: string;
  postalCode: string;
}

/**
 * The delegate's saved location, but only when it is incomplete - the cue for
 * the ticket-holder screens to show the optional TravelLocationCard. Null
 * when nothing is missing, so callers can pass the result straight through.
 */
export async function missingTravelLocation(userId: unknown): Promise<TravelLocation | null> {
  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: userId })
    .select("travelCountry travelRegion travelCity postalCode")
    .lean<Partial<TravelLocation>>();
  const location: TravelLocation = {
    travelCountry: doc?.travelCountry || "CA",
    travelRegion: doc?.travelRegion || "",
    travelCity: doc?.travelCity || "",
    postalCode: doc?.postalCode || "",
  };
  return needsTravelLocation(location) ? location : null;
}
