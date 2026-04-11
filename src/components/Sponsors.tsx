
import Image from "next/image";
import { useTranslations } from "next-intl";

const sponsorsList = [
    {
        name: "AngelCorp",
        website: "https://www.angelcorp.com",
        logo: "/assets/angelCorpLogo.png",
    },
];

export default function Sponsors() {
    const t = useTranslations("Sponsors");

    return (
        <section>
            <h2>{t("heading")}</h2>
            <div className="flex flex-wrap gap-6 items-center">
                {sponsorsList.map((sponsor) => (
                    <a
                        key={sponsor.name}
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image
                            src={sponsor.logo}
                            alt={sponsor.name}
                            width={160}
                            height={80}
                            style={{ objectFit: "contain" }}
                        />
                    </a>
                ))}
            </div>
        </section>
    );
}