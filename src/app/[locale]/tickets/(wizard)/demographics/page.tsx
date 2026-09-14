import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// The survey step became the Profile step. Kept as a redirect so older links,
// and any Auth0 returnTo still pointing here, land in the right place.
export default async function DemographicsPage() {
  redirect({ href: "/tickets/profile", locale: await getLocale() });
}
