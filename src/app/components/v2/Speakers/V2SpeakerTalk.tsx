"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/** Only confirmed titles get a disclosure. Keep unfinished profiles quiet. */
export default function V2SpeakerTalk({ title, abstract, role }: { title?: string; abstract?: string; role?: string }) {
  const t = useTranslations("V2.speakers");
  const id = useId();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);
  if (!title?.trim() || /^(tbd|tba|to be (announced|determined)|keynote speech)[.!?]*$/i.test(title.trim()) || role?.toLowerCase().startsWith(title.trim().toLowerCase())) return null;
  const open = pinned || hovered;
  return (
    <div className={`v2-spk-talk${open ? " is-open" : ""}`}
      onPointerEnter={event => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        setHovered(true);
      }}
      onPointerLeave={event => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        closeTimer.current = setTimeout(() => setHovered(false), 140);
      }}
      onKeyDown={event => {
        if (event.key === "Escape") {
          cancelClose();
          setPinned(false);
          setHovered(false);
        }
      }}>
      <button type="button" className="v2-spk-talk__toggle" aria-expanded={open} aria-controls={id}
        onClick={() => { cancelClose(); setPinned(!pinned); setHovered(false); }}>
        {pinned ? t("hide-talk") : t("view-talk")} <span className="v2-spk-talk__icon" aria-hidden="true" />
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
