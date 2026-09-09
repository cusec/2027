// Client-safe form option lists for the ticket wizard's demographic survey.
// No server-only imports here (no mongoose/mongodb) so client components can
// import this directly without pulling server code into the browser bundle.
// Kept in sync by hand with the enums in src/lib/models.ts.
//
// Deliberately short: Ticket Tailor's own checkout already collects name,
// email, student email, university, expected graduation and degree, so this
// survey must not ask for any of them again.

// Was a free-text box. A fixed list keeps the answers countable for badge
// printing and avoids collecting a sentence where a label was wanted;
// "other" is the catch-all so nobody is forced into a box that isn't theirs.
export const PRONOUN_OPTIONS: { value: string; label: string }[] = [
  { value: "she/her", label: "she/her" },
  { value: "he/him", label: "he/him" },
  { value: "they/them", label: "they/them" },
  { value: "she/they", label: "she/they" },
  { value: "he/they", label: "he/they" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
  { value: "other", label: "Other" },
];

export const TSHIRT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

// Splits the survey: a professional has no school, so the education and
// head-delegate questions are replaced by company/role. This is what removed
// the old free-text "current affiliation" field, which just duplicated
// whichever of the two the attendee happened to be.
export const ATTENDEE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "professional", label: "Professional" },
];

export const HEAD_DELEGATE_OPTIONS: { value: string; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

export const YES_NO_OPTIONS: { value: string; label: string }[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

// Coarse on purpose: this only has to be good enough to decide who hears
// about an airline discount and who hears about a hotel one.
export const TRAVEL_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "plane", label: "Flying" },
  { value: "train", label: "Train" },
  { value: "bus", label: "Bus" },
  { value: "car", label: "Driving" },
  { value: "local", label: "Already in Montréal" },
  { value: "undecided", label: "Not sure yet" },
];

// CUSEC has run every year since 2003; 2026 is the most recent edition, so
// 2027 (the one being bought) is deliberately not offered.
export const ATTENDED_YEAR_OPTIONS = Array.from(
  { length: 2026 - 2003 + 1 },
  (_, i) => String(2026 - i)
);

// Placeholder until the real conference schedule exists (see timeline notes
// in docs/ticket-tailor/ticket-tailor-flow.png — schedule lands closer to Dec).
export const EXCITED_EVENT_OPTIONS = [
  "Opening Keynote",
  "Workshops",
  "Sponsor Tech Talks",
  "Career Fair",
  "Networking Mixer",
  "Panel Discussions",
  "Hackathon / Coding Challenge",
  "Closing Ceremony",
];
