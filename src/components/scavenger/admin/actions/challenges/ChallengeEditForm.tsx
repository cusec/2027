"use client";

import { Challenge } from "@/lib/interface";
import { toLocalInput } from "./ChallengeAddForm";

interface ChallengeEditFormProps {
  challenge: Challenge;
  onChange: (challenge: Challenge) => void;
  onSave: (challenge: Challenge) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

const ChallengeEditForm = ({
  challenge,
  onChange,
  onSave,
  onCancel,
}: ChallengeEditFormProps) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(challenge);
      }}
      className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Title *
          </label>
          <input
            type="text"
            required
            value={challenge.title}
            onChange={(e) => onChange({ ...challenge, title: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Event
          </label>
          <input
            type="text"
            value={challenge.eventName}
            onChange={(e) =>
              onChange({ ...challenge, eventName: e.target.value })
            }
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-dark-mode">
          Type
        </label>
        <select
          value={challenge.mode}
          onChange={(e) =>
            onChange({
              ...challenge,
              mode: e.target.value as Challenge["mode"],
            })
          }
          className={inputClass}
        >
          <option value="individual">Individual — one entry per delegate</option>
          <option value="group">Group — one entry per team (Dev&apos;s Den)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Group challenges need delegates to create or join a team (max 4)
          before they can submit. Only one entry is accepted per team.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-dark-mode">
          Description
        </label>
        <textarea
          rows={2}
          value={challenge.description}
          onChange={(e) =>
            onChange({ ...challenge, description: e.target.value })
          }
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Points on approval
          </label>
          <input
            type="number"
            min={0}
            value={challenge.points}
            onChange={(e) =>
              onChange({ ...challenge, points: Number(e.target.value) || 0 })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Max submissions
          </label>
          <input
            type="number"
            min={0}
            value={challenge.maxSubmissions ?? ""}
            onChange={(e) =>
              onChange({
                ...challenge,
                maxSubmissions:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={inputClass}
            placeholder="Unlimited"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Opens
          </label>
          <input
            type="datetime-local"
            value={toLocalInput(challenge.activationStart)}
            onChange={(e) =>
              onChange({
                ...challenge,
                activationStart: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Closes
          </label>
          <input
            type="datetime-local"
            value={toLocalInput(challenge.activationEnd)}
            onChange={(e) =>
              onChange({
                ...challenge,
                activationEnd: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-dark-mode">
        <input
          type="checkbox"
          checked={challenge.active}
          onChange={(e) => onChange({ ...challenge, active: e.target.checked })}
        />
        Active (visible to delegates)
      </label>

      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Changing the points value does not re-score submissions that
        were already approved.</strong> Those delegates keep whatever they were
        granted at the time; adjust them in Manage Users if you need to.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-dark-mode hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ChallengeEditForm;
