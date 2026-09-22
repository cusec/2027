"use client";

import { useState } from "react";

export default function CopyEventLink({
  url,
  label,
  copyLabel,
  copiedLabel,
}: {
  url: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="v2-event-links__copy">
      <label htmlFor="event-link-url">{label}</label>
      <input id="event-link-url" type="url" value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
      <button type="button" className="v2-btn v2-btn--primary" onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          document.getElementById("event-link-url")?.focus();
        }
      }}>{copied ? copiedLabel : copyLabel}</button>
    </div>
  );
}
