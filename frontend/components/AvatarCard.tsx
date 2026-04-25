import { Activity, ChevronLeft, ChevronRight, Droplets, Flame, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AvatarVersion } from "@/lib/api";

const statMeta = [
  { key: "muscle", label: "Muscle", icon: Activity, color: "bg-mint" },
  { key: "fat", label: "Fat", icon: Flame, color: "bg-amber-400" },
  { key: "posture", label: "Posture", icon: ShieldCheck, color: "bg-violet" },
  { key: "tone", label: "Tone", icon: Droplets, color: "bg-sky-400" }
] as const;

type Props = {
  avatar: AvatarVersion | null;
  streakCount: number;
  busy?: boolean;
};

export function AvatarCard({ avatar, streakCount, busy = false }: Props) {
  const isBusy = busy || avatar?.wiro_status === "running";
  const hasAvatar = Boolean(avatar?.image_url);
  const views = useMemo(
    () => ({
      front: avatar?.views?.front || avatar?.image_url || null,
      back: avatar?.views?.back || null
    }),
    [avatar]
  );
  const hasBackView = Boolean(views.back);
  const [activeView, setActiveView] = useState<"front" | "back">("front");
  const activeImage = activeView === "back" && views.back ? views.back : views.front;
  const avatarStats = avatar?.stats;

  useEffect(() => {
    setActiveView("front");
  }, [avatar?.id, views.front, views.back]);

  function cycleView(direction: "prev" | "next") {
    if (!hasBackView) return;
    setActiveView((current) => {
      if (direction === "prev") return current === "front" ? "back" : "front";
      return current === "front" ? "back" : "front";
    });
  }

  return (
    <section className="glass-panel overflow-hidden rounded-[28px]">
      <div className="avatar-stage relative flex min-h-[390px] items-center justify-center overflow-hidden px-6 py-8">
        {activeImage ? (
          <>
            {hasBackView ? (
              <>
                <button
                  type="button"
                  aria-label="Show previous view"
                  onClick={() => cycleView("prev")}
                  className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-mint/30 bg-white/75 text-slate-700 shadow-lg transition hover:border-violet hover:text-violet"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Show next view"
                  onClick={() => cycleView("next")}
                  className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-mint/30 bg-white/75 text-slate-700 shadow-lg transition hover:border-violet hover:text-violet"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={activeView === "front" ? "AI fitness avatar front view" : "AI fitness avatar back view"}
              className="h-[310px] w-auto max-w-full rounded-[24px] object-contain drop-shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-mint/30 bg-white/80 px-3 py-2 text-xs text-slate-700 shadow-sm">
              <span className={activeView === "front" ? "text-violet" : ""}>Front</span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span className={activeView === "back" ? "text-violet" : ""}>Back</span>
            </div>
          </>
        ) : (
          <div className="grid h-[310px] w-[240px] place-items-center rounded-[26px] border border-dashed border-mint/25 bg-mint/10 px-6 text-center text-sm text-slate-700">
            {avatar?.wiro_status === "running"
              ? "Avatar is being prepared."
              : avatar?.wiro_status === "failed"
                ? "Avatar generation failed. Try clearer photos."
                : "This section will open after you upload your form."}
          </div>
        )}
      </div>
      <div className="relative p-5">
        {hasAvatar && avatarStats ? (
          <div className={`grid gap-4 transition ${isBusy ? "blur-[2px] opacity-60" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Today&apos;s form</h2>
              </div>
              <StreakPill streakCount={streakCount} />
            </div>
            <div className="grid gap-3">
              {statMeta.map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="grid grid-cols-[88px_1fr_40px] items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Icon size={16} />
                    {label}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${avatarStats[key]}%` }} />
                  </div>
                  <span className="text-right text-sm text-slate-700">{avatarStats[key]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-mint/25 bg-mint/10 p-4 text-sm text-slate-700">
            This section will open after you upload your form.
          </div>
        )}
        {isBusy ? <AvatarScoreLoading /> : null}
      </div>
    </section>
  );
}

function StreakPill({ streakCount }: { streakCount: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-mint/35 bg-[linear-gradient(145deg,rgba(245,255,250,0.96),rgba(219,248,232,0.92))] px-3 py-2 text-sm text-[#1d5a3f] shadow-[0_10px_26px_rgba(52,132,79,0.14)]">
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#7df2ab_0%,#34c977_45%,#1d9d58_100%)] text-white shadow-[0_0_20px_rgba(52,201,119,0.28)]">
        <span className="absolute inset-0 rounded-full bg-mint/35 blur-sm" />
        <Flame size={15} className="relative" />
      </span>
      <span>{`streak = ${Math.max(0, streakCount)}`}</span>
    </div>
  );
}

function AvatarScoreLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-[28px] bg-white/45 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3">
        <div className="score-loader">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} className="score-dot" style={{ ["--i" as string]: index } as CSSProperties} />
          ))}
        </div>
        <p className="text-sm text-slate-700">Loading... scoring your form</p>
      </div>
    </div>
  );
}
