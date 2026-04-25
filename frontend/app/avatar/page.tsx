"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { AppChrome } from "@/components/AppChrome";
import { AvatarCard } from "@/components/AvatarCard";
import { FlowFooter } from "@/components/FlowFooter";
import { RouteGate } from "@/components/RouteGate";
import { UploadPanel } from "@/components/UploadPanel";
import { completeProfile, generateAvatar, getAvatarTask, uploadPhotos } from "@/lib/api";
import { hasCreatedAvatar } from "@/lib/flow";
import { useFitnessSession } from "@/lib/session";

export default function AvatarPage() {
  const { state, setState, booting, error, setError } = useFitnessSession();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [age, setAge] = useState<number>(24);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(72);
  const busy = loading || Boolean(pendingTaskId) || state?.current_avatar?.wiro_status === "running";
  const bmi = heightCm > 0 ? weightKg / ((heightCm / 100) * (heightCm / 100)) : 0;

  const message = useMemo(() => {
    if (error) return error;
    if (!state?.current_avatar?.image_url && state?.current_avatar?.wiro_status !== "running") {
      return "Upload your photos. Your avatar, views, and scores will appear here.";
    }
    if (state?.current_avatar?.wiro_status === "running") {
      return "Your avatar is being generated. Scores and identity will update when it is ready.";
    }
    return "Your first generated avatar is now stored as the base identity.";
  }, [error, state]);

  useEffect(() => {
    if (!state?.profile) return;
    if (state.profile.age) setAge(state.profile.age);
    if (state.profile.height_cm) setHeightCm(state.profile.height_cm);
    if (state.profile.weight_kg) setWeightKg(state.profile.weight_kg);
  }, [state?.profile]);

  useEffect(() => {
    if (!pendingTaskId) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const result = await getAvatarTask(pendingTaskId);
        if (cancelled) return;
        if (result.state) setState(result.state);
        if (result.status === "completed" || result.output_url) {
          setPendingTaskId(null);
          setError("Avatar generated successfully.");
        }
        if (result.status === "failed") {
          setPendingTaskId(null);
          setError("Wiro generation failed. Try clearer photos.");
        }
      } catch (err) {
        if (cancelled) return;
        setPendingTaskId(null);
        setError(err instanceof Error ? err.message : "Wiro task polling failed.");
      }
    }, 3200);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingTaskId, setError, setState]);

  async function generate() {
    if (!state || !front || !back) {
      setError("Please upload both front and back body photos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uploaded = await uploadPhotos(state.profile.id, front, back);
      setFrontUrl(uploaded.front_url);
      setBackUrl(uploaded.back_url);
      const result = await generateAvatar({
        userId: state.profile.id,
        frontUrl: uploaded.front_url,
        backUrl: uploaded.back_url
      });
      setState(result.state);
      if (result.task_id) setPendingTaskId(result.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate avatar.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!state) return;
    setSavingProfile(true);
    setProfileSaved(false);
    setError(null);
    try {
      const nextState = await completeProfile({
        userId: state.profile.id,
        age,
        heightCm,
        weightKg
      });
      setState(nextState);
      setProfileSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (booting) return <main className="min-h-screen bg-ink" />;
  if (!state) {
    return (
      <>
        <RouteGate state={state} booting={booting} pathname="/avatar" />
        <main className="min-h-screen bg-ink" />
      </>
    );
  }

  return (
    <AppChrome>
      <RouteGate state={state} booting={booting} pathname="/avatar" />
      <section className="glass-panel rounded-[28px] p-5">
        <h2 className="text-2xl font-bold">Complete profile</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm text-slate-700">Age</span>
            <input
              type="number"
              min={13}
              max={100}
              value={age}
              onChange={(event) => {
                setAge(Number(event.target.value));
                setProfileSaved(false);
              }}
              className="h-12 rounded-xl border border-mint/25 bg-white/40 px-3 outline-none transition focus:border-violet"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-700">Height (cm)</span>
            <input
              type="number"
              min={100}
              max={260}
              value={heightCm}
              onChange={(event) => {
                setHeightCm(Number(event.target.value));
                setProfileSaved(false);
              }}
              className="h-12 rounded-xl border border-mint/25 bg-white/40 px-3 outline-none transition focus:border-violet"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-700">Weight (kg)</span>
            <input
              type="number"
              min={30}
              max={300}
              value={weightKg}
              onChange={(event) => {
                setWeightKg(Number(event.target.value));
                setProfileSaved(false);
              }}
              className="h-12 rounded-xl border border-mint/25 bg-white/40 px-3 outline-none transition focus:border-violet"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">Current BMI: {Number.isFinite(bmi) ? bmi.toFixed(1) : "-"}</p>
          <div className="flex items-center gap-3">
            {profileSaved ? (
              <span className="rounded-full border border-mint/30 bg-mint/15 px-3 py-1 text-sm text-[#1d5a3f]">Profile saved successfully.</span>
            ) : null}
            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet px-4 text-sm font-bold text-white shadow-glow disabled:opacity-60"
            >
              <Save size={16} />
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <UploadPanel
          front={front}
          back={back}
          loading={loading}
          onFrontChange={setFront}
          onBackChange={setBack}
          onGenerate={generate}
        />
        <div className="lg:order-first">
          <AvatarCard avatar={state.current_avatar} busy={busy} streakCount={state.profile.streak_count} />
        </div>
      </section>
      <section className="glass-panel rounded-3xl p-4 text-sm text-slate-700">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 text-violet" />
          <span>{message}</span>
        </div>
        {frontUrl || backUrl ? (
          <p className="mt-2 text-xs text-slate-600">Body references uploaded and linked to the Wiro task.</p>
        ) : null}
      </section>
      <FlowFooter step="avatar" nextPath={hasCreatedAvatar(state) ? "/my-progress" : "/avatar"} disabled={!hasCreatedAvatar(state)} />
    </AppChrome>
  );
}
