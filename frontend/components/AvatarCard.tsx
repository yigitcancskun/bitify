import { Activity, Droplets, Flame, ShieldCheck } from "lucide-react";
import type { AvatarVersion } from "@/lib/api";

const statMeta = [
  { key: "muscle", label: "Muscle", icon: Activity, color: "bg-mint" },
  { key: "fat", label: "Fat", icon: Flame, color: "bg-amber-400" },
  { key: "posture", label: "Posture", icon: ShieldCheck, color: "bg-violet" },
  { key: "tone", label: "Tone", icon: Droplets, color: "bg-sky-400" }
] as const;

export function AvatarCard({ avatar }: { avatar: AvatarVersion | null }) {
  const stats = avatar?.stats ?? { muscle: 24, fat: 42, posture: 50, tone: 28 };

  return (
    <section className="glass-panel overflow-hidden rounded-[28px]">
      <div className="avatar-stage relative flex min-h-[390px] items-center justify-center overflow-hidden px-6 pt-8">
        <div className="absolute left-5 top-5 rounded-full border border-mint/25 bg-mint/15 px-3 py-1 text-xs text-slate-700">
          {avatar?.wiro_status === "running" ? "Wiro processing" : avatar?.wiro_status === "failed" ? "Generation failed" : "My avatar"}
        </div>
        {avatar?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar.image_url}
            alt="AI fitness avatar"
            className="h-[310px] w-auto max-w-full rounded-[24px] object-contain drop-shadow-2xl"
          />
        ) : (
          <div className="grid h-[310px] w-[220px] place-items-center rounded-[26px] border border-dashed border-mint/25 bg-mint/10 text-center text-sm text-slate-700">
            {avatar?.wiro_status === "running"
              ? "Generating with Wiro"
              : avatar?.wiro_status === "failed"
                ? "Try another photo"
                : "No generated avatar yet"}
          </div>
        )}
      </div>
      <div className="grid gap-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-600">Micro-evolution state</p>
            <h2 className="text-2xl font-bold">Today&apos;s form</h2>
          </div>
          <div className="rounded-2xl bg-mint/15 px-3 py-2 text-sm text-slate-700">Day {avatar?.day_number ?? 1}</div>
        </div>
        <div className="grid gap-3">
          {statMeta.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="grid grid-cols-[88px_1fr_40px] items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Icon size={16} />
                {label}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${stats[key]}%` }} />
              </div>
              <span className="text-right text-sm text-slate-700">{stats[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
