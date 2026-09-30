"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gamepad2, Lock } from "lucide-react";
import Cabinet from "./Cabinet";
import { ALL_MODES, MODE_ART, isPlayable } from "./modes";
import type { ModeKey } from "./modes";

/**
 * The arcade hub: one wall of cabinets, one active at a time. The heading
 * above stays server-rendered in the page; this component owns the wall and
 * mounts the shared cabinet for whichever mode the visitor picks.
 */
export default function V2Arcade() {
  const t = useTranslations("V2.play");
  const [active, setActive] = useState<ModeKey | null>(null);

  if (active && isPlayable(active)) {
    return <Cabinet game={active} onExit={() => setActive(null)} />;
  }

  return (
    <ul className="v2-arcade__grid">
      {ALL_MODES.map((key) => (
        <li key={key}>
          <button type="button"
            className={`v2-arcade__tile v2-glass${isPlayable(key) ? "" : " is-soon"}`}
            disabled={!isPlayable(key)}
            onClick={() => setActive(key)}>
            <img className="v2-arcade__pose" src={MODE_ART[key]} alt="" loading="lazy" width={72} height={72} />
            <span className="v2-arcade__tile-text">
              <strong className="v2-pixel">{t(`modes.${key}.title` as never)}</strong>
              <span>{t(`modes.${key}.tagline` as never)}</span>
            </span>
            <span className="v2-arcade__chip" aria-hidden="true">
              {isPlayable(key) ? <Gamepad2 size={16} /> : <Lock size={16} />}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
