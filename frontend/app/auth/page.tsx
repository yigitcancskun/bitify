"use client";

import { Loader2, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPostAuthPath } from "@/lib/flow";
import { useFitnessSession } from "@/lib/session";

type AuthMode = "login" | "register";

const features = [
  {
    icon: Target,
    title: "AI-personalized coaching",
    body: "Your plan adapts around your body, your rhythm, and the outcome you want to reach faster."
  },
  {
    icon: Sparkles,
    title: "Avatar evolution updates",
    body: "See your body story turn into visible progress with refreshed avatar states over time."
  },
  {
    icon: Zap,
    title: "Workout and calorie tracking",
    body: "Stay honest with your effort by logging workouts, daily consistency, and energy balance signals."
  },
  {
    icon: Trophy,
    title: "Leaderboard accountability",
    body: "Compete with momentum, keep your streak alive, and stay pushed by visible public progress."
  }
];

export default function AuthPage() {
  const router = useRouter();
  const { state, booting, loading, error, setError, login, register } = useFitnessSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (booting || !state) return;
    router.replace(getPostAuthPath(state));
  }, [booting, router, state]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "login") {
      const result = await login(username, password);
      if (result) router.push(getPostAuthPath(result));
      return;
    }

    const result = await register(username, password);
    if (result) router.push("/flow");
  }

  if (booting) return <main className="min-h-screen bg-ink" />;

  return (
    <main className="min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="glass-panel rounded-[32px] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="grid gap-6">
              <img src="/bitify.png" alt="Bitify" className="h-auto w-36 object-contain" />
              <div className="grid gap-3">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-600"></p>
                <h1 className="text-5xl leading-[1.02] text-slate-900 sm:text-6xl">
                  </h1>
                <p className="max-w-xl text-lg text-slate-700">
                </p>
              </div>
              <div className="grid gap-3 rounded-[28px] border border-mint/20 bg-white/40 p-4">
                {features.map(({ icon: Icon, title, body }) => (
                  <article key={title} className="rounded-2xl border border-mint/15 bg-mint/10 p-4">
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet/12 text-violet">
                      <Icon size={18} />
                    </div>
                    <h2 className="text-xl text-slate-900">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
                  </article>
                ))}
              </div>
            </div>

            <section className="rounded-[28px] border border-mint/20 bg-white/45 p-5 shadow-[0_18px_40px_rgba(52,132,79,0.1)]">
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-mint/10 p-1">
                {(["login", "register"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item);
                      setError(null);
                    }}
                    className={`h-11 rounded-xl text-sm transition ${
                      mode === item ? "bg-violet text-white shadow-glow" : "text-slate-700 hover:bg-mint/20"
                    }`}
                  >
                    {item === "login" ? "Log in" : "Create account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-slate-700">Nickname</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Shadow_427"
                    className="h-14 rounded-2xl border border-mint/25 bg-mint/15 px-4 text-slate-900 outline-none transition focus:border-violet"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm text-slate-700">Password</span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    type="password"
                    className="h-14 rounded-2xl border border-mint/25 bg-mint/15 px-4 text-slate-900 outline-none transition focus:border-violet"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet font-bold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  {mode === "login" ? "Log in" : "Create account"}
                </button>
                {error ? (
                  <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-900">{error}</p>
                ) : null}
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
