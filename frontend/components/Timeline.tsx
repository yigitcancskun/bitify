import type { AvatarVersion } from "@/lib/api";

export function Timeline({ history }: { history: AvatarVersion[] }) {
  const current = history[history.length - 1];
  const projectedMuscle = Math.min(100, (current?.stats.muscle ?? 24) + 8);
  const items = [
    { label: "Day 1", value: history[0]?.stats.muscle ?? 24 },
    { label: "Today", value: current?.stats.muscle ?? 24 },
    { label: "Day 7", value: projectedMuscle }
  ];

  return (
    <section className="glass-panel rounded-[28px] p-5">
      <p className="text-sm text-slate-600">Mini timeline</p>
      <h2 className="mb-5 text-2xl font-bold">Progress trace</h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div key={item.label} className="relative rounded-2xl border border-mint/25 bg-mint/10 p-4">
            <p className="text-xs text-slate-600">{item.label}</p>
            <p className="mt-1 text-2xl font-black">{item.value}</p>
            <p className="text-xs text-slate-500">muscle score</p>
            {index < items.length - 1 ? <div className="absolute -right-3 top-1/2 h-px w-3 bg-violet" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
