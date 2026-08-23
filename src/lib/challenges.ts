/**
 * Shared rules for the challenge submission platform.
 *
 * Kept out of the route files so the delegate-facing POST and the admin
 * listing endpoints agree on exactly what "open" means.
 */

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
