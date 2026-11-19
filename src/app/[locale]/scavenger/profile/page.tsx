import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function LegacyProfilePage() {
  redirect({ href: "/profile", locale: await getLocale() });
}
