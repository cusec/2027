import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function DemographicsPage() {
  redirect({ href: "/tickets/profile", locale: await getLocale() });
}
