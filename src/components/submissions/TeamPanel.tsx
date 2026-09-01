"use client";

import { useState } from "react";
import { Users, LogOut, KeyRound, Plus } from "lucide-react";
import type { useTeams } from "./submissionsDAO";

/**
 * Team membership for group challenges. Shown only when at least one group
 * challenge exists, so individual-only events never see it.
 */
/** Owned by SubmissionsPage so joining a team updates the cards at once. */
type TeamsState = ReturnType<typeof useTeams>;

const TeamPanel = ({ teams: t }: { teams: TeamsState }) => {
  const {
    teams,
    myTeam,
    maxTeamSize,
    loading,
    error,
    busy,
    setError,
    createTeam,
    joinTeam,
    joinByCode,
    leaveTeam,
  } = t;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  if (loading) {
    return (
      <div className="aero-panel aero-team">
        <p>Loading teams…</p>
      </div>
    );
  }

  if (myTeam) {
    return (
      <div className="aero-panel aero-team">
        <div className="aero-team__head">
          <div>
            <p className="aero-eyebrow">Your team</p>
            <h3 className="aero-team__name">{myTeam.name}</h3>
          </div>
          <span className="aero-team__count">
            {myTeam.members.length}/{maxTeamSize}
          </span>
        </div>

        <ul className="aero-team__members">
          {myTeam.members.map((m) => (
            <li key={m._id}>{m.name || m.email}</li>
          ))}
        </ul>

        <p className="aero-team__code">
          <KeyRound aria-hidden="true" />
          Join code <b>{myTeam.joinCode}</b>
        </p>

        {error && <p className="aero-team__error">{error}</p>}

        <button
          type="button"
          className="aero-btn aero-btn--glass"
          disabled={busy}
          onClick={leaveTeam}
        >
          <LogOut aria-hidden="true" />
          Leave team
        </button>
      </div>
    );
  }

  const joinable = teams.filter((t) => t.members.length < maxTeamSize);

  return (
    <div className="aero-panel aero-team">
      <p className="aero-eyebrow">Group challenges</p>
      <h3 className="aero-team__name">Create or join a team</h3>
      <p className="aero-team__hint">
        Teams are capped at {maxTeamSize}. One entry per team — any member can
        submit it.
      </p>

      {error && <p className="aero-team__error">{error}</p>}

      <form
        className="aero-team__form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await createTeam(name)) setName("");
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your team name"
          aria-label="New team name"
          required
        />
        <button type="submit" className="aero-btn" disabled={busy}>
          <Plus aria-hidden="true" />
          Create
        </button>
      </form>

      <form
        className="aero-team__form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await joinByCode(code)) setCode("");
        }}
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Have a join code?"
          aria-label="Join code"
          maxLength={8}
          required
        />
        <button type="submit" className="aero-btn aero-btn--glass" disabled={busy}>
          Join
        </button>
      </form>

      {joinable.length > 0 && (
        <>
          <p className="aero-team__hint aero-team__hint--list">
            <Users aria-hidden="true" />
            Teams with space
          </p>
          <ul className="aero-team__list">
            {joinable.map((t) => (
              <li key={t._id}>
                <span>{t.name}</span>
                <i>
                  {t.members.length}/{maxTeamSize}
                </i>
                <button
                  type="button"
                  className="aero-btn aero-btn--glass"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    joinTeam(t._id);
                  }}
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default TeamPanel;
