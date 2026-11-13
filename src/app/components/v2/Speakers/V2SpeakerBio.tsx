"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export default function V2SpeakerBio({ bio }: { bio?: string }) {
  const t = useTranslations("V2.speakers");
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);
  const text = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => {
    const node = text.current;
    if (!node) return;
    const measure = () => setHeight(node.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [bio]);
  if (!bio?.trim()) return null;
  return <div className={`v2-spk-bio${open ? " is-open" : ""}`}>
    <div className="v2-spk-bio__viewport" style={{ height: height ? (open ? height : Math.min(height, 72)) : 72 }}>
      <p className="v2-spk-bio__preview" aria-hidden={open}>{bio}</p>
      <p id={id} ref={text} className="v2-spk-bio__full" aria-hidden={!open}>{bio}</p>
    </div>
    {height > 72 && <button type="button" className="v2-spk-bio__toggle" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(current => !current)}
      onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>{open ? t("less-bio") : t("more-bio")}</button>}
  </div>;
}
