/**
 * Shared rules for the challenge submission platform.
 *
 * Kept out of the route files so the delegate-facing POST and the admin
 * listing endpoints agree on exactly what "open" means.
 */

/** Dev's Den teams cap at four (TECHxEVENTS.txt, Kelly). */
export const MAX_TEAM_SIZE = 4;

export type ChallengeMode = "individual" | "group";

/** Join codes are short, unambiguous and easy to read out loud. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Team names are shown publicly, so keep them short and printable. */
export function validateTeamName(value: unknown): string | null {
  if (typeof value !== "string") return "Team name is required";
  const name = value.trim();
  if (name.length < 2) return "Team name must be at least 2 characters";
  if (name.length > 40) return "Team name must be 40 characters or fewer";
  return null;
}

interface ChallengeWindow {
  active?: boolean;
  activationStart?: Date | string | null;
  activationEnd?: Date | string | null;
  maxSubmissions?: number | null;
  submissionCount?: number;
}

/**
 * A challenge accepts submissions when it is active, inside its activation
 * window (if one is set), and under its submission cap (if one is set).
 * Mirrors the activation semantics used by hunt items.
 */
export function isChallengeOpen(
  challenge: ChallengeWindow,
  now: Date = new Date()
): boolean {
  if (!challenge.active) return false;

  const { activationStart, activationEnd } = challenge;
  if (activationStart && now < new Date(activationStart)) return false;
  if (activationEnd && now > new Date(activationEnd)) return false;

  const max = challenge.maxSubmissions;
  if (max !== null && max !== undefined && (challenge.submissionCount ?? 0) >= max) {
    return false;
  }

  return true;
}

/**
 * Delegates submit links (YouTube/TikTok/etc.), never file uploads, so the
 * only validation we can do is that the value is a well-formed http(s) URL.
 */
export function isValidSubmissionUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Both activation dates must be supplied together, and end must follow start.
 * Returns an error message, or null when the pair is valid.
 */
export function validateActivationWindow(
  activationStart: string | null | undefined,
  activationEnd: string | null | undefined
): string | null {
  if (
    (activationStart && !activationEnd) ||
    (!activationStart && activationEnd)
  ) {
    return "Both activation start and end dates must be provided, or neither";
  }

  if (activationStart && activationEnd) {
    if (new Date(activationEnd) <= new Date(activationStart)) {
      return "Activation end date must be after start date";
    }
  }

  return null;
}
