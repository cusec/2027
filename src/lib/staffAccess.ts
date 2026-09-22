import type { User } from "@auth0/nextjs-auth0/types";

export function hasVerifiedCusecEmail(user: User): boolean {
  return user.email_verified === true && /^[^@\s]+@cusec\.net$/i.test(user.email ?? "");
}
