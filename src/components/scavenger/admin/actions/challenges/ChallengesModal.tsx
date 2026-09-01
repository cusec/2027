"use client";

import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Challenge } from "@/lib/interface";
import { useChallenges, emptyChallengeFormData } from "./challengesDAO";
import ChallengeAddForm from "./ChallengeAddForm";
import ChallengesList from "./ChallengesList";
import ChallengeSubmissionsModal from "./ChallengeSubmissionsModal";

interface ChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChallengesModal = ({ isOpen, onClose }: ChallengesModalProps) => {
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const {
    challenges,
    loading,
    error,
    editingItem,
    showAddForm,
    formData,
    isSubmitting,
    setError,
    setEditingItem,
    setShowAddForm,
    setFormData,
    createChallenge,
    updateChallenge,
    deleteChallenge,
  } = useChallenges(isOpen);

  // Match on title or event name, so an events lead can pull up just theirs.
  const filteredChallenges = useMemo(() => {
    if (!searchQuery.trim()) return challenges;

    const query = searchQuery.toLowerCase();
    return challenges.filter(
      (challenge) =>
        challenge.title.toLowerCase().includes(query) ||
        challenge.eventName.toLowerCase().includes(query)
    );
  }, [challenges, searchQuery]);

  const showSubmissions = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setSubmissionsModalOpen(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setFormData(emptyChallengeFormData);
  };

  return (
    <>
      <Modal
        simple={true}
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Challenges"
        className="max-w-4xl max-h-[70vh] text-dark-mode"
      >
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-dark-mode">
              Challenges ({filteredChallenges.length}
              {searchQuery && ` of ${challenges.length}`})
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              disabled={isSubmitting}
            >
              <Plus size={16} />
              Add Challenge
            </button>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search challenges by title or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            )}
          </div>

          {showAddForm && (
            <ChallengeAddForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={createChallenge}
              onCancel={handleCancelAdd}
              isSubmitting={isSubmitting}
            />
          )}

          <ChallengesList
            items={filteredChallenges}
            loading={loading}
            editingItem={editingItem}
            onEdit={setEditingItem}
            onSave={updateChallenge}
            onCancelEdit={() => setEditingItem(null)}
            onDelete={deleteChallenge}
            onShowSubmissions={showSubmissions}
            onEditingItemChange={setEditingItem}
          />
        </div>
      </Modal>

      <ChallengeSubmissionsModal
        isOpen={submissionsModalOpen}
        onClose={() => setSubmissionsModalOpen(false)}
        challenge={selectedChallenge}
      />
    </>
  );
};

export default ChallengesModal;
