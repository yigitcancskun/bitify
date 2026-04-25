"use client";

import { useEffect, useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { FlowFooter } from "@/components/FlowFooter";
import { Leaderboard } from "@/components/Leaderboard";
import { RouteGate } from "@/components/RouteGate";
import { getLeaderboard, type LeaderboardResponse, type LeaderboardSort } from "@/lib/api";
import { useFitnessSession } from "@/lib/session";

export default function CommunityPage() {
  const { state, booting } = useFitnessSession();
  const [sort, setSort] = useState<LeaderboardSort>("streak");
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
  if (!state || !state.current_avatar?.image_url) {
    return (
      <>
        <RouteGate state={state} booting={booting} pathname="/community" />
        <main className="min-h-screen bg-ink" />
      </>
    );
  }

  return (
    <AppChrome>
      <RouteGate state={state} booting={booting} pathname="/community" />
      <Leaderboard rows={leaderboard?.rows ?? []} sort={sort} loading={leaderboardLoading} onSortChange={setSort} />
      <FlowFooter step="community" />
    </AppChrome>
  );
}
