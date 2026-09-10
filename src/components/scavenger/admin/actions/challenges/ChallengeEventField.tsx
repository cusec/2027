"use client";

import { useState } from "react";
import { CHALLENGE_EVENTS } from "@/lib/challenges";

/** Sentinel for the select — never stored, only ever swapped for typed text. */
const OTHER = "__other__";

interface ChallengeEventFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** The owning form's input styling, which differs slightly between the two. */
  className: string;
}

const isPreset = (value: string) =>
  (CHALLENGE_EVENTS as readonly string[]).includes(value);

/**
 * Event picker shared by the add and edit forms.
 *
 * A challenge already saved with a name that is not on the preset list opens
 * in "Other" with its text intact, so editing an existing custom track never
 * silently rewrites it.
 */
const ChallengeEventField = ({
  value,
  onChange,
  className,
}: ChallengeEventFieldProps) => {
  const [isOther, setIsOther] = useState(() => value !== "" && !isPreset(value));

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-dark-mode">
        Event
      </label>

      <select
        value={isOther ? OTHER : value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) {
            // Clear rather than carry the old preset over, so the text box
            // starts empty instead of pre-filled with "Dev's Den".
            setIsOther(true);
            onChange("");
          } else {
            setIsOther(false);
            onChange(next);
          }
        }}
        className={className}
      >
        <option value="">None</option>
        {CHALLENGE_EVENTS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>

      {isOther && (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} mt-2`}
          placeholder="New event name"
        />
      )}
    </div>
  );
};

export default ChallengeEventField;
