"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

/** Only confirmed titles get a disclosure. Keep unfinished profiles quiet. */
export default function V2SpeakerTalk({ title, abstract, role }: { title?: string; abstract?: string; role?: string }) {
  const t = useTranslations("V2.speakers");
  const id = useId();
  const [open, setOpen] = useState(false);
  if (!title?.trim() || /^(tbd|tba|to be (announced|determined)|keynote speech)[.!?]*$/i.test(title.trim()) || role?.toLowerCase().startsWith(title.trim().toLowerCase())) return null;
  return (
    <div className={`v2-spk-talk${open ? " is-open" : ""}`}
      onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
      <button type="button" className="v2-spk-talk__toggle" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(current => !current)}>
        {open ? t("hide-talk") : t("view-talk")} <span className="v2-spk-talk__icon" aria-hidden="true" />
      </button>
      <div id={id} aria-hidden={!open} inert={!open} className="v2-spk-talk__panel">
        <div className="v2-spk-talk__clip">
          <div className="v2-spk-talk__content">
            <h3>{title}</h3>
            {abstract && <p>{abstract}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
