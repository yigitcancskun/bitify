"use client";

import { Dumbbell, Loader2, Sparkles, Utensils, Waves } from "lucide-react";

type Props = {
  workout: boolean;
  diet: boolean;
  waterCups: number;
  loading: boolean;
  onWorkoutChange: (value: boolean) => void;
  onDietChange: (value: boolean) => void;
  onWaterChange: (value: number) => void;
  onSubmit: () => void;
  onGenerateUpdate: () => void;
  canGenerate: boolean;
  showGenerateUpdate?: boolean;
};

export function CheckinPanel({
  workout,
  diet,
  waterCups,
  loading,
  onWorkoutChange,
  onDietChange,
  onWaterChange,
  onSubmit,
  onGenerateUpdate,
  canGenerate,
  showGenerateUpdate = true
}: Props) {
  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Log today</h2>
        </div>
        <div className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">+75 XP</div>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onWorkoutChange(!workout)}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            workout ? "border-mint/60 bg-mint/12" : "border-mint/25 bg-mint/10"
          }`}
        >
          <span className="flex items-center gap-3">
            <Dumbbell size={20} />
            <span>
              <span className="block font-semibold">Workout</span>
              <span className="text-sm text-slate-600">+35 XP, improves muscle and posture</span>
            </span>
          </span>
          <span className="text-lg">{workout ? "✓" : ""}</span>
        </button>

        <button
          type="button"
          onClick={() => onDietChange(!diet)}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            diet ? "border-mint/60 bg-mint/12" : "border-mint/25 bg-mint/10"
          }`}
        >
          <span className="flex items-center gap-3">
            <Utensils size={20} />
            <span>
              <span className="block font-semibold">Nutrition</span>
              <span className="text-sm text-slate-600">+25 XP, affects fat and tone</span>
            </span>
          </span>
          <span className="text-lg">{diet ? "✓" : ""}</span>
        </button>

        <label className="rounded-2xl border border-mint/25 bg-mint/10 p-4">
          <span className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-3 font-semibold">
              <Waves size={20} />
              Water
            </span>
            <span className="text-sm text-slate-700">{waterCups} / 8 cups</span>
          </span>
          <input
            aria-label="Water cups"
            type="range"
            min={0}
            max={12}
            value={waterCups}
            onChange={(event) => onWaterChange(Number(event.target.value))}
            className="w-full accent-violet"
          />
        </label>
      </div>

      <div className={`mt-5 grid grid-cols-1 gap-3 ${showGenerateUpdate ? "sm:grid-cols-2" : ""}`}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet px-5 py-4 font-bold shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          Check in
        </button>
        {showGenerateUpdate ? (
          <button
            type="button"
            onClick={onGenerateUpdate}
            disabled={!canGenerate || loading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-violet/50 bg-violet/15 px-5 py-4 font-bold text-violet transition hover:bg-violet/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles size={18} />
            Update avatar
          </button>
        ) : null}
      </div>
    </section>
  );
}
