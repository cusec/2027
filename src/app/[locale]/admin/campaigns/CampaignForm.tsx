"use client";

import { useState, useCallback } from "react";
import type { CampaignChannel } from "@/lib/campaigns";

const CHANNEL_DESTINATIONS: Record<CampaignChannel, string> = {
  meetup: "/meet",
  school: "/tickets",
  social: "/",
  partner: "/",
};

const CHANNEL_LABELS: Record<string, string> = {
  meetup: "Meetup",
  school: "School",
  social: "Social",
  partner: "Partner",
};

export default function CampaignForm({
  locale,
  namePlaceholder,
  channelLabel,
  destinationLabel,
  destinationHint,
  createLabel,
}: {
  locale: string;
  namePlaceholder: string;
  channelLabel: string;
  destinationLabel: string;
  destinationHint: string;
  createLabel: string;
}) {
  const [channel, setChannel] = useState<CampaignChannel>("meetup");
  const [destination, setDestination] = useState<string>(CHANNEL_DESTINATIONS.meetup);

  const handleChannelChange = useCallback((
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newChannel = event.target.value as CampaignChannel;
    setChannel(newChannel);
    setDestination(CHANNEL_DESTINATIONS[newChannel]);
  }, []);

  return (
    <form className="v2-campaign__form" action="/api/admin/campaigns" method="post">
      <input type="hidden" name="locale" value={locale} />
      <label>
        {channelLabel}
        <input name="name" maxLength={100} required placeholder={namePlaceholder} />
      </label>
      <label>
        {channelLabel}
        <select
          name="channel"
          value={channel}
          onChange={handleChannelChange}
        >
          <option value="meetup">{CHANNEL_LABELS.meetup}</option>
          <option value="school">{CHANNEL_LABELS.school}</option>
          <option value="social">{CHANNEL_LABELS.social}</option>
          <option value="partner">{CHANNEL_LABELS.partner}</option>
        </select>
      </label>
      <label className="v2-campaign__destination">
        {destinationLabel}
        <input
          name="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          maxLength={512}
          placeholder={CHANNEL_DESTINATIONS.meetup}
        />
      </label>
      <button className="v2-btn v2-btn--primary" type="submit">
        {createLabel}
      </button>
      <p className="v2-campaign__note">{destinationHint}</p>
    </form>
  );
}
