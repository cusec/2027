// Client-safe form option lists for the ticket wizard's demographic survey.
// No server-only imports here (no mongoose/mongodb) so client components can
// import this directly without pulling server code into the browser bundle.
// Kept in sync by hand with the enums in src/lib/models.ts.

export const TSHIRT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export const DEGREE_LEVEL_OPTIONS = [
  "High School",
  "College Diploma",
  "Bachelor's",
  "Master's",
  "PhD",
  "Other",
];

export const HEAD_DELEGATE_OPTIONS: { value: string; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

export const PREVIOUSLY_ATTENDED_OPTIONS = ["2024", "2025", "2026", "none"];

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
