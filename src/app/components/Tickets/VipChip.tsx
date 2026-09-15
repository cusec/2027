"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

export default function VipChip({
  label,
  heading,
  perks,
  className = "",
}: {
  label: string;
  heading: string;
  perks: string[];
  className?: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`vip-chip${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className="vip-chip__button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <Info aria-hidden="true" />
      </button>
      <div id={panelId} className="vip-chip__panel">
        <p className="vip-chip__heading">{heading}</p>
        <ul>
          {perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
