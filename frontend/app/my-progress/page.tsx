"use client";

import { useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { CheckinPanel } from "@/components/CheckinPanel";
import { DailyScoreChart } from "@/components/DailyScoreChart";
import { FlowFooter } from "@/components/FlowFooter";
import { RouteGate } from "@/components/RouteGate";
import { StatsHeader } from "@/components/StatsHeader";
import { submitCheckin } from "@/lib/api";
import { useFitnessSession } from "@/lib/session";

export default function MyProgressPage() {
  const { state, setState, booting, error, setError } = useFitnessSession();
  const [workout, setWorkout] = useState(false);
  const [workoutAreas, setWorkoutAreas] = useState<Array<"chest" | "back" | "shoulder" | "leg">>([]);
  const [waterLiters, setWaterLiters] = useState(2);
  const [loading, setLoading] = useState(false);

  function toggleWorkoutArea(area: "chest" | "back" | "shoulder" | "leg") {
    setWorkoutAreas((current) => (current.includes(area) ? current.filter((item) => item !== area) : [...current, area]));
  }

  async function checkin() {
    if (!state) return;
    setLoading(true);
    setError(null);
    try {
      const result = await submitCheckin({
        userId: state.profile.id,
        workout,
        diet: false,
        waterLiters
      });
      setState(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit daily log.");
    } finally {
      setLoading(false);
    }
  }

  if (booting) return <main className="min-h-screen bg-ink" />;
  if (!state || !state.current_avatar?.image_url) {
    return (
      <>
        <RouteGate state={state} booting={booting} pathname="/my-progress" />
        <main className="min-h-screen bg-ink" />
      </>
    );
  }

  return (
    <AppChrome>
      <RouteGate state={state} booting={booting} pathname="/my-progress" />
      <section className="glass-panel rounded-3xl p-5">
        <p className="text-lg text-slate-900">{state.profile.username}, you are ready for your bitify progress</p>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          <StatsHeader profile={state.profile} />
          <section className="glass-panel rounded-[28px] p-5">
            <h2 className="text-2xl font-bold">BMI progress</h2>
            <p className="mt-2 text-sm text-slate-700">
              Current BMI:{" "}
              {state.profile.height_cm && state.profile.weight_kg
                ? (state.profile.weight_kg / ((state.profile.height_cm / 100) * (state.profile.height_cm / 100))).toFixed(1)
                : "Complete your profile first."}
            </p>
          </section>
        </div>
        <CheckinPanel
          workout={workout}
          workoutAreas={workoutAreas}
          waterLiters={waterLiters}
          loading={loading}
          onWorkoutChange={setWorkout}
          onWorkoutAreaToggle={toggleWorkoutArea}
          onWaterChange={setWaterLiters}
          onSubmit={checkin}
        />
      </section>
      <section className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <DailyScoreChart recentLogs={state.recent_logs} />
        </div>
      </section>
      <FlowFooter step="my-progress" />
    </AppChrome>
  );
}
