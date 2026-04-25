import { BadgeCheck, Flame, Gem, Trophy, type LucideIcon } from "lucide-react";
import type { Profile } from "@/lib/api";

export function StatsHeader({ profile }: { profile: Profile }) {
  const progress = profile.xp % 100;
  return (
    <header className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">{profile.username}</h1>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet shadow-glow">
          <BadgeCheck size={24} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={Trophy} label="Level" value={profile.level} />
        <Metric icon={Flame} label="Streak" value={profile.streak_count} />
        <Metric icon={Gem} label="Credits" value={profile.credits} />
      </div>
      <div className="rounded-2xl border border-mint/25 bg-mint/10 p-4">
        <div className="mb-2 flex justify-between text-sm text-slate-700">
          <span>{profile.xp} XP</span>
          <span>{progress} / 100</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-mint" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </header>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-mint/25 bg-mint/10 p-3">
      <Icon className="mb-2 text-mint" size={18} />
      <p className="text-xs text-slate-600">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}
