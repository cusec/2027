"use client";

import { useRouter } from "@/i18n/navigation";
import AvatarCustomize from "@/components/scavenger/onboarding/AvatarCustomize";

export default function AvatarStepClient() {
  const router = useRouter();

  const handleComplete = async () => {
    try {
      await fetch("/api/ticket-wizard/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "avatar" }),
      });
    } finally {
      router.push("/tickets/purchase");
    }
  };

  return <AvatarCustomize onComplete={handleComplete} />;
}
