"use client";

import { ChevronDown, Droplet, Dumbbell, Loader2, Sparkles, Utensils } from "lucide-react";

type WorkoutArea = "chest" | "back" | "shoulder" | "leg";

type Props = {
  workout: boolean;
  workoutAreas: WorkoutArea[];
  waterLiters: number;
  loading: boolean;
  onWorkoutChange: (value: boolean) => void;
  onWorkoutAreaToggle: (area: WorkoutArea) => void;
  onWaterChange: (value: number) => void;
  onSubmit: () => void;
};

const WORKOUT_AREAS: Array<{ key: WorkoutArea; label: string }> = [
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulder", label: "Shoulder" },
  { key: "leg", label: "Leg" }
];

export function CheckinPanel({
  workout,
  workoutAreas,
  waterLiters,
  loading,
  onWorkoutChange,
  onWorkoutAreaToggle,
  onWaterChange,
  onSubmit
}: Props) {
  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">Log today</h2>
      </div>

      <div className="grid gap-3">
        <div className="relative z-10">
          <button
            type="button"
            onClick={() => onWorkoutChange(!workout)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-300 ease-out ${
              workout ? "border-mint/60 bg-mint/12 shadow-[0_10px_24px_rgba(52,132,79,0.12)]" : "border-mint/25 bg-mint/10"
            }`}
          >
            <span className="flex items-center gap-3">
              <Dumbbell size={20} />
              <span className="block font-semibold">Workout</span>
            </span>
            <span className={`transition-transform duration-300 ${workout ? "rotate-180" : ""}`}>
              <ChevronDown size={18} />
            </span>
          </button>

          <div
            className={`pointer-events-none absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl border border-mint/30 bg-[rgba(236,250,243,0.98)] p-4 shadow-[0_20px_48px_rgba(32,99,63,0.24)] backdrop-blur-xl transition-all duration-300 ease-out ${
              workout ? "translate-y-0 scale-100 opacity-100 pointer-events-auto" : "-translate-y-2 scale-[0.98] opacity-0"
            }`}
          >
            <div className="grid grid-cols-2 gap-2">
              {WORKOUT_AREAS.map((area) => (
                <label key={area.key} className="flex items-center gap-2 rounded-xl border border-mint/20 bg-mint/10 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={workoutAreas.includes(area.key)}
                    onChange={() => onWorkoutAreaToggle(area.key)}
                    className="h-4 w-4 accent-violet"
                  />
                  <span>{area.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-mint/25 bg-mint/10 p-4">
          <span className="mb-2 flex items-center gap-3 font-semibold">
            <Utensils size={20} />
            Nutrition
          </span>
          <p className="text-sm text-slate-600">This feature is a premium feature. Upgrade to unlock.</p>
        </div>

        <label className="rounded-2xl border border-mint/25 bg-mint/10 p-4">
          <span className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-3 font-semibold">
              <Droplet size={20} />
              Water
            </span>
            <span className="text-sm text-slate-700">{waterLiters.toFixed(2)} L</span>
          </span>
          <input
            aria-label="Water liters"
            type="range"
            min={0}
            max={6}
            step={0.25}
            value={waterLiters}
            onChange={(event) => onWaterChange(Number(event.target.value))}
            className="w-full accent-violet"
          />
        </label>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet px-5 py-4 font-bold shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          Check in
        </button>
      </div>
    </section>
  );
}
