"use client";

import { ChallengeFormData } from "@/lib/interface";

interface ChallengeAddFormProps {
  formData: ChallengeFormData;
  setFormData: (data: ChallengeFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

/** Converts a Date/ISO value into the `datetime-local` input format. */
export function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

const ChallengeAddForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSubmitting,
}: ChallengeAddFormProps) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className={inputClass}
            placeholder="Record a 30s reel"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-dark-mode">
            Event
          </label>
          <input
            type="text"
            value={formData.eventName}
            onChange={(e) =>
              setFormData({ ...formData, eventName: e.target.value })
            }
            className={inputClass}
            placeholder="Dev's Den"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-dark-mode">
          Type
        </label>
        <select
          value={formData.mode}
          onChange={(e) =>
            setFormData({
              ...formData,
              mode: e.target.value as ChallengeFormData["mode"],
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
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className={inputClass}
          placeholder="What delegates need to do, and what to link."
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
            value={formData.points}
            onChange={(e) =>
              setFormData({ ...formData, points: Number(e.target.value) || 0 })
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
            value={formData.maxSubmissions ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
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
            value={toLocalInput(formData.activationStart)}
            onChange={(e) =>
              setFormData({
                ...formData,
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
            value={toLocalInput(formData.activationEnd)}
            onChange={(e) =>
              setFormData({
                ...formData,
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
          checked={formData.active}
          onChange={(e) =>
            setFormData({ ...formData, active: e.target.checked })
          }
        />
        Active (visible to delegates)
      </label>

      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Heads up:</strong> approving a submission credits these points
        to the delegate straight away. Reverting an approval does{" "}
        <strong>not</strong> take them back automatically &mdash; you will be
        told how many to remove by hand in Manage Users.
      </p>

      <p className="text-xs text-gray-500">
        Leave both dates empty to keep the challenge open for as long as it is
        active. If you set one, you must set both.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create Challenge"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-dark-mode hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ChallengeAddForm;
