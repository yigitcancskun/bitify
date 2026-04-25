"use client";

import { useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { CheckinPanel } from "@/components/CheckinPanel";
import { IdentityGate } from "@/components/IdentityGate";
import { StatsHeader } from "@/components/StatsHeader";
import { Timeline } from "@/components/Timeline";
import { submitCheckin } from "@/lib/api";
import { useFitnessSession } from "@/lib/session";

export default function MyProgressPage() {
  const { state, setState, booting, loading: sessionLoading, error, setError, login, register } = useFitnessSession();
  const [workout, setWorkout] = useState(false);
  const [diet, setDiet] = useState(false);
  const [waterCups, setWaterCups] = useState(6);
  const [loading, setLoading] = useState(false);

  async function checkin() {
    if (!state) return;
    setLoading(true);
    setError(null);
    try {
      const result = await submitCheckin({
        userId: state.profile.id,
        workout,
        diet,
        waterCups
      });
      setState(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit daily log.");
    } finally {
      setLoading(false);
    }
  }

  if (booting) return <main className="min-h-screen bg-ink" />;
  if (!state) return <IdentityGate loading={sessionLoading} error={error} onLogin={login} onRegister={register} />;

  return (
    <AppChrome>
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          <StatsHeader profile={state.profile} />
          <Timeline history={state.avatar_history} />
        </div>
        <CheckinPanel
          workout={workout}
          diet={diet}
          waterCups={waterCups}
          loading={loading}
          onWorkoutChange={setWorkout}
          onDietChange={setDiet}
          onWaterChange={setWaterCups}
          onSubmit={checkin}
          onGenerateUpdate={() => {}}
          canGenerate={false}
          showGenerateUpdate={false}
        />
      </section>
    </AppChrome>
  );
}
