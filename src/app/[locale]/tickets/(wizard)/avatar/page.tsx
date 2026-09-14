import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// The avatar step is hidden until the avatar builder is ready, rather than
// showing an empty "coming soon" screen mid-purchase. /tickets sends each
// delegate on to whichever step is actually next. AvatarStepClient is kept
// for when the step comes back.
export default async function AvatarPage() {
  redirect({ href: "/tickets", locale: await getLocale() });
}
