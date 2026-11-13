import { useTranslations } from "next-intl";

/** Render only complete HTTPS links supplied in the speaker's social field. */
export default function V2SpeakerLinks({ socials = "" }: { socials?: string }) {
  const t = useTranslations("V2.speakers");
  const links = [...new Set(socials.match(/https:\/\/[^\s<>"\)]+/g) ?? [])];
  const validLinks = links.flatMap(href => {
    try {
      const url = new URL(href);
      if (url.username || url.password) return [];
      const host = url.hostname.replace(/^www\./, "");
      const labels: Record<string, string> = {
        "linkedin.com": "LinkedIn", "github.com": "GitHub", "instagram.com": "Instagram",
        "tiktok.com": "TikTok", "x.com": "X", "twitter.com": "X",
      };
      // Distinguish the two Instagram accounts supplied for Japnit.
      const account = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
      const instagramLabel = host === "instagram.com"
        ? account === "japnitahuja" ? t("instagram-personal")
          : account === "gogirlorganisation" ? t("instagram-go-girl") : undefined
        : undefined;
      return [{ href: url.href, label: instagramLabel ?? labels[host] ?? t("website") }];
    } catch {
      return [];
    }
  });
  if (validLinks.length === 0) return null;
  return (
    <div className="v2-spk-links">
      {validLinks.map(link => (
        <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
      ))}
    </div>
  );
}
