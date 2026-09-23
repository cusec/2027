"use client";

import { useState } from "react";

export default function CampaignLink({
  url,
  copyLabel,
  copiedLabel,
  qrLabel,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
  qrLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=400&margin=2`;

  return (
    <div className="v2-campaign__link">
      <input aria-label={copyLabel} readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      <button type="button" onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }}>{copied ? copiedLabel : copyLabel}</button>
      <a href={qrUrl} target="_blank" rel="noopener noreferrer" aria-label={qrLabel}>
        <img src={qrUrl} width={64} height={64} alt="" loading="lazy" />
      </a>
    </div>
  );
}
