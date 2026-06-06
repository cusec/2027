"use client";

import Image from "next/image";

interface AvatarCustomizeProps {
  onComplete: () => void;
}

const AvatarCustomize = ({ onComplete }: AvatarCustomizeProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/linking-screen-3.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">🎨</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Customize your avatar
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Coming soon — we&apos;re still cooking this up.
        </p>

        <button
          onClick={onComplete}
          className="w-full py-2 rounded-lg bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors cursor-pointer"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AvatarCustomize;
