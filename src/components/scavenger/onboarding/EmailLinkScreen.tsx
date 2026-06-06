"use client";

import { useState } from "react";
import Image from "next/image";
import { Auth0User, DbUser } from "@/lib/interface";

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>"'`]/g, "")
    .replace(/[\\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface EmailLinkScreenProps {
  user: Auth0User;
  dbUser: DbUser;
  onEmailLinked: (email: string) => void;
  onSkip: () => void;
}

type Step = "input" | "confirm";

const EmailLinkScreen = ({
  user,
  dbUser,
  onEmailLinked,
  onSkip,
}: EmailLinkScreenProps) => {
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState(
    sanitizeInput(dbUser.name || "")
  );
  const [discordHandle, setDiscordHandle] = useState(
    sanitizeInput(dbUser.discord_handle || "")
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    const sanitized = sanitizeInput(email);
    if (!sanitized) {
      setError("Please enter an email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setEmail(sanitized);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/users/link-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linked_email: sanitizeInput(email),
          name: sanitizeInput(displayName),
          discord_handle: sanitizeInput(discordHandle),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onEmailLinked(data.linked_email);
      } else {
        setError(data.message || data.error || "Failed to link email.");
        setStep("input");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("input");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/linking-screen-1.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        {step === "input" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Welcome to CUSEC 2027!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Link your ticket email to unlock scanning, points, and the
              leaderboard.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ticket Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-2"
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={handleNext}
              className="w-full py-2 rounded-lg bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors mb-3 cursor-pointer"
            >
              Next
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2 rounded-lg text-gray-400 text-sm hover:text-gray-600 transition-colors cursor-pointer"
            >
              Skip for now
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep("input")}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 cursor-pointer"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Confirm your details
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              Linking{" "}
              <span className="font-semibold text-teal-600">{email}</span> to
              your account{" "}
              <span className="font-semibold text-teal-600">{user.email}</span>.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) =>
                setDisplayName(sanitizeInput(e.target.value))
              }
              placeholder="Your display name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discord Handle{" "}
              <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={discordHandle}
              onChange={(e) =>
                setDiscordHandle(sanitizeInput(e.target.value))
              }
              placeholder="@handle"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-4"
            />

            <p className="text-xs text-gray-400 mb-1">
              Display name must comply with the CUSEC Code of Conduct.
            </p>
            <p className="text-xs text-gray-400 mb-5">
              To change your name later, contact us through the support channel.
            </p>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !displayName.trim()}
              className="w-full py-2 rounded-lg bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Linking…" : "Confirm & Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailLinkScreen;
