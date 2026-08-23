"use client";

import { useState, useEffect } from "react";
import { Challenge, ChallengeFormData, Submission } from "@/lib/interface";

export const emptyChallengeFormData: ChallengeFormData = {
  title: "",
  description: "",
  eventName: "",
  points: 0,
  active: true,
  activationStart: null,
  activationEnd: null,
  maxSubmissions: null,
};

export const useChallenges = (isOpen: boolean) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Challenge | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<ChallengeFormData>(
    emptyChallengeFormData
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/challenges");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch challenges");
      }

      setChallenges(data.challenges);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch challenges"
      );
      console.error("Error fetching challenges:", err);
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create challenge");
      }

      setChallenges([data.challenge, ...challenges]);
      setFormData(emptyChallengeFormData);
      setShowAddForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create challenge"
      );
      console.error("Error creating challenge:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateChallenge = async (item: Challenge) => {
    try {
      setError(null);

      const response = await fetch(`/api/challenges/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          eventName: item.eventName,
          points: item.points,
          active: item.active,
          activationStart: item.activationStart,
          activationEnd: item.activationEnd,
          maxSubmissions: item.maxSubmissions,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update challenge");
      }

      setChallenges(
        challenges.map((c) => (c._id === item._id ? data.challenge : c))
      );
      setEditingItem(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update challenge"
      );
      console.error("Error updating challenge:", err);
    }
  };

  const deleteChallenge = async (id: string) => {
    if (
      !confirm(
        "Delete this challenge? Every submission made to it will also be removed."
      )
    ) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/challenges/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete challenge");
      }

      setChallenges(challenges.filter((c) => c._id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete challenge"
      );
      console.error("Error deleting challenge:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChallenges();
      setError(null);
      setEditingItem(null);
      setShowAddForm(false);
      setFormData(emptyChallengeFormData);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  return {
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
    fetchChallenges,
  };
};

/** Submissions for one challenge, loaded on demand by the review modal. */
export const useChallengeSubmissions = (
  challengeId: string | null,
  isOpen: boolean
) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when reverting an approval leaves points that must be removed by hand.
  const [warning, setWarning] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    if (!challengeId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/challenges/${challengeId}/submissions`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch submissions");
      }

      setSubmissions(data.submissions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch submissions"
      );
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (
    submissionId: string,
    status: "pending" | "approved" | "rejected"
  ) => {
    try {
      setError(null);

      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update submission");
      }

      setSubmissions((current) =>
        current.map((s) => (s._id === submissionId ? data.submission : s))
      );

      // The API never deducts points on its own — if it returned a warning,
      // the admin has a manual adjustment to make.
      setWarning(data.warning ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update submission"
      );
      console.error("Error updating submission:", err);
    }
  };

  useEffect(() => {
    if (isOpen && challengeId) {
      fetchSubmissions();
    } else {
      setSubmissions([]);
      setError(null);
      setWarning(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, challengeId]);

  return {
    submissions,
    loading,
    error,
    setError,
    warning,
    setWarning,
    setStatus,
    fetchSubmissions,
  };
};
