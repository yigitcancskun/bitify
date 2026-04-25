"use client";

import { Activity, Award, Flame, Gauge, ShieldCheck, TrendingUp, UserRound } from "lucide-react";
import type { LeaderboardRow, LeaderboardSort } from "@/lib/api";

const sortOptions: Array<{ key: LeaderboardSort; label: string; metricLabel: string }> = [
  { key: "xp", label: "XP", metricLabel: "XP" },
  { key: "level", label: "Level", metricLabel: "Level" },
  { key: "streak", label: "Streak", metricLabel: "Days" },
  { key: "muscle", label: "Muscle", metricLabel: "Muscle" },
  { key: "fat", label: "Lower Fat", metricLabel: "Fat" },
  { key: "posture", label: "Posture", metricLabel: "Posture" },
  { key: "tone", label: "Tone", metricLabel: "Tone" }
];

const metricIcons: Record<LeaderboardSort, typeof TrendingUp> = {
  xp: TrendingUp,
  level: Award,
  streak: Flame,
  muscle: Activity,
  fat: Gauge,
  posture: ShieldCheck,
  tone: Activity
};

export function Leaderboard({
  rows,
  sort,
  loading,
  onSortChange
}: {
  rows: LeaderboardRow[];
  sort: LeaderboardSort;
  loading: boolean;
  onSortChange: (sort: LeaderboardSort) => void;
}) {
  const currentOption = sortOptions.find((option) => option.key === sort) ?? sortOptions[0];
  const MetricIcon = metricIcons[sort];

  return (
    <section className="grid gap-4">
      <header className="glass-panel rounded-3xl p-5">
        <p className="text-sm text-slate-600">Community</p>
        <h1 className="text-3xl text-slate-900">Leaderboard</h1>
        <p className="mt-2 text-slate-700">Anonymous users ranked from live profile and body-score data.</p>
      </header>

      <div className="glass-panel rounded-3xl p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onSortChange(option.key)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm transition ${
                sort === option.key ? "bg-violet text-white shadow-glow" : "bg-mint/15 text-slate-700 hover:bg-mint/25"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[54px_1fr_96px] gap-3 border-b border-mint/25 p-4 text-sm text-slate-600">
          <span>Rank</span>
          <span>User</span>
          <span className="text-right">{currentOption.metricLabel}</span>
        </div>
        {loading ? (
          <div className="p-5 text-slate-700">Loading leaderboard...</div>
        ) : rows.length ? (
          <div className="divide-y divide-mint/20">
            {rows.map((row) => (
              <article
                key={row.user_id}
                className={`grid grid-cols-[54px_1fr_96px] items-center gap-3 p-4 ${
                  row.is_current_user ? "bg-mint/20" : ""
                }`}
              >
                <div className="text-xl text-slate-900">#{row.rank}</div>
                <div className="flex min-w-0 items-center gap-3">
                  <IdleProfileBadge active={row.is_current_user} />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg text-slate-900">{row.display_name}</h2>
                    <p className="truncate text-xs text-slate-600">
                      Level {row.level} | {row.xp} XP | Streak {row.streak_count}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 text-right text-slate-900">
                  <MetricIcon size={16} className="text-mint" />
                  <span className="text-xl">{row.score}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5 text-slate-700">No registered users yet.</div>
        )}
      </div>
    </section>
  );
}

function IdleProfileBadge({ active }: { active: boolean }) {
  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
        active ? "border-mint bg-mint/25" : "border-mint/25 bg-mint/15"
      }`}
      aria-label="Idle profile avatar"
    >
      <UserRound size={22} className="text-slate-700" />
    </div>
  );
}
