"use client";

import { useEffect, useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { IdentityGate } from "@/components/IdentityGate";
import { Leaderboard } from "@/components/Leaderboard";
import { getLeaderboard, type LeaderboardResponse, type LeaderboardSort } from "@/lib/api";
import { useFitnessSession } from "@/lib/session";

export default function CommunityPage() {
  const { state, booting, loading, error, login, register } = useFitnessSession();
  const [sort, setSort] = useState<LeaderboardSort>("xp");
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (!state?.profile.id) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    getLeaderboard(state.profile.id, sort)
      .then((result) => {
        if (!cancelled) setLeaderboard(result);
      })
      .catch(() => {
        if (!cancelled) setLeaderboard({ sort, rows: [] });
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, state?.profile.id]);

  if (booting) return <main className="min-h-screen bg-ink" />;
  if (!state) return <IdentityGate loading={loading} error={error} onLogin={login} onRegister={register} />;

  return (
    <AppChrome>
      <Leaderboard rows={leaderboard?.rows ?? []} sort={sort} loading={leaderboardLoading} onSortChange={setSort} />
    </AppChrome>
  );
}
