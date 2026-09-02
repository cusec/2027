"use client";

import { useState } from "react";
import { Users, LogOut, KeyRound, Plus } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { useTeams } from "./submissionsDAO";

/** Owned by SubmissionsPage so joining a team updates the cards at once. */
type TeamsState = ReturnType<typeof useTeams>;

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamsState;
}

/** Team membership, opened from the challenge that needs it. */
const TeamModal = ({ isOpen, onClose, teams: t }: TeamModalProps) => {
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

  const joinable = teams.filter((team) => team.members.length < maxTeamSize);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={myTeam ? "Your team" : "Create or join a team"}
      className="max-w-lg"
    >
      {loading ? (
        <p className="aero-team__hint">Loading teams…</p>
      ) : myTeam ? (
        <>
          <div className="aero-team__head">
            <h3 className="aero-team__name">{myTeam.name}</h3>
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

          <p className="aero-team__hint">
            One entry per team — any member can submit it, and it counts for
            everyone.
          </p>

          {error && <p className="aero-team__error">{error}</p>}

          <div className="aero-team__form">
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
        </>
      ) : (
        <>
          <p className="aero-team__hint">
            Teams are capped at {maxTeamSize}. One entry per team — any member
            can submit it.
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

          <p className="aero-team__divide">or</p>

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
            <button
              type="submit"
              className="aero-btn aero-btn--glass"
              disabled={busy}
            >
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
                {joinable.map((team) => (
                  <li key={team._id}>
                    <span>{team.name}</span>
                    <i>
                      {team.members.length}/{maxTeamSize}
                    </i>
                    <button
                      type="button"
                      className="aero-btn aero-btn--glass"
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        joinTeam(team._id);
                      }}
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Modal>
  );
};

export default TeamModal;
