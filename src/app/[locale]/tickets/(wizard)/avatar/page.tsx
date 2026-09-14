import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AvatarPage() {
  redirect({ href: "/tickets", locale: await getLocale() });
}
