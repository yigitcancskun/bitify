"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { AppChrome } from "@/components/AppChrome";
import { AvatarCard } from "@/components/AvatarCard";
import { FlowFooter } from "@/components/FlowFooter";
import { RouteGate } from "@/components/RouteGate";
import { UploadPanel } from "@/components/UploadPanel";
import { generateAvatar, getAvatarTask, uploadPhotos } from "@/lib/api";
import { hasCreatedAvatar } from "@/lib/flow";
import { useFitnessSession } from "@/lib/session";

export default function AvatarPage() {
  const { state, setState, booting, error, setError } = useFitnessSession();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const busy = loading || Boolean(pendingTaskId) || state?.current_avatar?.wiro_status === "running";

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
