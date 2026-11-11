import { useTranslations } from "next-intl";
import { SPEAKERS, type Speaker } from "./speakersData";
import V2SpeakerAvatar from "./V2SpeakerAvatar";
import V2SpeakerTalk from "./V2SpeakerTalk";
import V2SpeakerLinks from "./V2SpeakerLinks";

export default function V2SpeakerGrid({ speakers = SPEAKERS }: { speakers?: Speaker[] }) {
  const t = useTranslations("V2.speakers");
  return (
    <section className="v2-section v2-spk-grid" id="grid" aria-label={t("heading")}>
      <div className="v2-container">
        <ul className="v2-spk-grid__list">
          {speakers.map((speaker, index) => (
            <li key={speaker.announced?.name ?? index} className="v2-spk-card">
              <V2SpeakerAvatar from={speaker.from} to={speaker.to}
                photo={speaker.announced?.photo} focus={speaker.announced?.focus} />
              {speaker.announced ? (
                <>
                  <h2 className="v2-spk-card__name">{speaker.announced.name}</h2>
                  <p className="v2-spk-card__role">{speaker.announced.role}</p>
                  <V2SpeakerTalk title={speaker.announced.talk} abstract={speaker.announced.abstract} role={speaker.announced.role} />
                  <V2SpeakerLinks socials={speaker.announced.socials} />
                </>
              ) : <h2 className="v2-spk-card__name">{t("announcing")}</h2>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
