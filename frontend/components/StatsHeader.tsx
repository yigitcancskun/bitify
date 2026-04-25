import { Flame, Gem, HeartPulse, type LucideIcon } from "lucide-react";
import type { Profile } from "@/lib/api";

export function StatsHeader({ profile }: { profile: Profile }) {
  const bmi = calculateBmi(profile.height_cm, profile.weight_kg);
  return (
    <header className="grid gap-4">
      <div>
        <h1 className="text-3xl font-black">{profile.username}</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={Flame} label="Streak" value={profile.streak_count} />
        <Metric icon={Gem} label="Credits" value={profile.credits} />
        <Metric icon={HeartPulse} label="BMI Now" value={bmi ? Number(bmi.toFixed(1)) : "-"} />
      </div>
    </header>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-mint/25 bg-mint/10 p-3">
      <Icon className="mb-2 text-mint" size={18} />
      <p className="text-xs text-slate-600">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function calculateBmi(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg) return null;
  const meter = heightCm / 100;
  if (!meter) return null;
  return weightKg / (meter * meter);
}
