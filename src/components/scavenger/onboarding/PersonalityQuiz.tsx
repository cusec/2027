"use client";

import { useState } from "react";
import Image from "next/image";

const Q1_OPTIONS = [
  { id: "hunter", label: "Dive in headfirst" },
  { id: "strategist", label: "Plan it out" },
  { id: "connector", label: "Rally the team" },
  { id: "explorer", label: "Think outside the box" },
] as const;

const Q2_OPTIONS = [
  { id: "network", label: "Meet new people" },
  { id: "learn", label: "Soak up knowledge" },
  { id: "compete", label: "Win the hunt" },
  { id: "explore", label: "Just explore" },
] as const;

type Q1Answer = (typeof Q1_OPTIONS)[number]["id"];
type Q2Answer = (typeof Q2_OPTIONS)[number]["id"];

interface PersonalityQuizProps {
  onComplete: (personalityType: string | null) => void;
  onSkip: () => void;
}

const PersonalityQuiz = ({ onComplete, onSkip }: PersonalityQuizProps) => {
  const [q1, setQ1] = useState<Q1Answer | null>(null);
  const [q2, setQ2] = useState<Q2Answer | null>(null);

  const handleSubmit = () => {
    onComplete(q1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/linking-screen-2.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Quick — who are you?
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Two questions. No wrong answers.
        </p>

        {/* Q1 */}
        <p className="text-sm font-semibold text-gray-700 mb-3">
          1. How do you tackle a challenge?
        </p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {Q1_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setQ1(opt.id)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                q1 === opt.id
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-teal-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Q2 */}
        <p className="text-sm font-semibold text-gray-700 mb-3">
          2. What&apos;s your CUSEC goal?
        </p>
        <div className="grid grid-cols-2 gap-2 mb-7">
          {Q2_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setQ2(opt.id)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                q2 === opt.id
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-teal-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!q1 || !q2}
          className="w-full py-2 rounded-lg bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-3"
        >
          Next
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2 rounded-lg text-gray-400 text-sm hover:text-gray-600 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default PersonalityQuiz;
