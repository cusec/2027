"use client";

import { Challenge } from "@/lib/interface";
import ChallengeDisplay from "./ChallengeDisplay";
import ChallengeEditForm from "./ChallengeEditForm";

interface ChallengesListProps {
  items: Challenge[];
  loading: boolean;
  editingItem: Challenge | null;
  onEdit: (challenge: Challenge) => void;
  onSave: (challenge: Challenge) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onShowSubmissions: (challenge: Challenge) => void;
  onEditingItemChange: (challenge: Challenge) => void;
}

const ChallengesList = ({
  items,
  loading,
  editingItem,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onShowSubmissions,
  onEditingItemChange,
}: ChallengesListProps) => {
  if (loading) {
    return (
      <p className="py-8 text-center text-gray-500">Loading challenges...</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        No challenges yet. Create one to start collecting submissions.
      </p>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto">
      {items.map((challenge) =>
        editingItem && editingItem._id === challenge._id ? (
          <ChallengeEditForm
            key={challenge._id}
            challenge={editingItem}
            onChange={onEditingItemChange}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        ) : (
          <ChallengeDisplay
            key={challenge._id}
            challenge={challenge}
            onEdit={onEdit}
            onDelete={onDelete}
            onShowSubmissions={onShowSubmissions}
          />
        )
      )}
    </div>
  );
};

export default ChallengesList;
