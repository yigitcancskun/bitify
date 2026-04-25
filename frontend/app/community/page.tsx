"use client";

import { AppChrome } from "@/components/AppChrome";
import { CommunityFeed } from "@/components/CommunityFeed";
import { IdentityGate } from "@/components/IdentityGate";
import { useFitnessSession } from "@/lib/session";

export default function CommunityPage() {
  const { state, booting, loading, error, startAnonymous } = useFitnessSession();

  if (booting) return <main className="min-h-screen bg-ink" />;
  if (!state) return <IdentityGate loading={loading} error={error} onStart={startAnonymous} />;

  return (
    <AppChrome>
      <CommunityFeed />
    </AppChrome>
  );
}
