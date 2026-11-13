import { useTranslations } from "next-intl";
import V2SpeakerAvatar from "./V2SpeakerAvatar";
import V2SpeakerBio, { SpeakerCard } from "./V2SpeakerBio";
import V2SpeakerTalk from "./V2SpeakerTalk";
import V2SpeakerLinks from "./V2SpeakerLinks";
import { ANNOUNCED_KEYNOTES, type AnnouncedKeynote } from "./speakersData";

export default function V2Keynote({ keynotes = ANNOUNCED_KEYNOTES }: { keynotes?: AnnouncedKeynote[] }) {
  const t = useTranslations("V2.speakers");
  return (
    <section className="v2-section v2-keynote">
      <div className="v2-container v2-keynote__stack">
        {keynotes.map(keynote => (
          <SpeakerCard as="article" key={keynote.name} className="v2-keynote__card v2-glass">
            <V2SpeakerAvatar from={keynote.from} to={keynote.to} photo={keynote.photo}
              focus={keynote.focus} className="v2-spk-avatar--lg" />
            <div className="v2-keynote__body">
              <p className="v2-keynote__eyebrow">{t("keynote-chip-1")}</p>
              <h2 className="v2-keynote__speaker">{keynote.name}</h2>
              <p className="v2-keynote__role">{keynote.role}</p>
              <V2SpeakerBio bio={keynote.bio} />
              <V2SpeakerTalk title={keynote.talk} abstract={keynote.abstract} role={keynote.role} />
              <V2SpeakerLinks socials={keynote.socials} />
            </div>
          </SpeakerCard>
        ))}
      </div>
    </section>
  );
}
