"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

const CardHover = createContext(false);

/** The whole card reveals the bio, even when no talk has been announced. */
export function SpeakerCard({ as: Tag, className, children }: {
  as: "article" | "li"; className: string; children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelClose() { if (timer.current !== null) clearTimeout(timer.current); }
  useEffect(() => () => cancelClose(), []);
  return <CardHover.Provider value={hovered}>
    <Tag className={className}
      onPointerEnter={event => { if (event.pointerType === "mouse") { cancelClose(); setHovered(true); } }}
      onPointerLeave={event => { if (event.pointerType === "mouse") { cancelClose(); timer.current = setTimeout(() => setHovered(false), 140); } }}>
      {children}
    </Tag>
  </CardHover.Provider>;
}

export default function V2SpeakerBio({ bio }: { bio?: string }) {
  const t = useTranslations("V2.speakers");
  const hovered = useContext(CardHover);
  const [pinned, setPinned] = useState(false);
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
  const open = hovered || pinned;
  return <div className={`v2-spk-bio${open ? " is-open" : ""}`}>
    <div className="v2-spk-bio__viewport" style={{ height: height ? (open ? height : Math.min(height, 72)) : 72 }}>
      <p className="v2-spk-bio__preview" aria-hidden={open}>{bio}</p>
      <p id={id} ref={text} className="v2-spk-bio__full" aria-hidden={!open}>{bio}</p>
    </div>
    {height > 72 && <button type="button" className="v2-spk-bio__toggle" aria-expanded={open} aria-controls={id}
      onClick={() => setPinned(!pinned)}>{pinned ? t("less-bio") : t("more-bio")}</button>}
  </div>;
}
