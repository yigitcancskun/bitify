"use client";

import Link from "next/link";
import { ArrowRight, ChartLine, ShieldCheck, Sparkles, Users } from "lucide-react";

const highlights = [
  {
    icon: Sparkles,
    title: "Build your avatar",
    body: "Start with body photos and turn them into a stylized fitness identity that stays consistent over time."
  },
  {
    icon: ChartLine,
    title: "Track your form",
    body: "Keep muscle, fat, and tone visible in one clean progress view designed for quick daily check-ins."
  },
  {
    icon: Users,
    title: "Join in community",
    body: "Flow naturally into the leaderboard once your personal profile and progress are ready to share."
  }
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="glass-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="grid gap-6">
              <img src="/bitify.png" alt="Bitify" className="h-auto w-36 object-contain" />
              <div className="grid gap-4">
                <p className="text-sm uppercase tracking-[0.26em] text-slate-600">Fitness flow</p>
                <h1 className="max-w-3xl text-5xl leading-[1.05] text-slate-900 sm:text-6xl">
                </h1>
                <p className="max-w-2xl text-lg text-slate-700">
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet px-6 font-bold text-white shadow-glow transition hover:scale-[1.01]"
                >
                  Continue
                  <ArrowRight size={18} />
                </Link>
                <div className="inline-flex h-14 items-center gap-2 rounded-2xl border border-mint/30 bg-mint/12 px-5 text-slate-700">
                  <ShieldCheck size={18} className="text-mint" />
                  Auth, avatar, progress, community
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-mint/25 bg-[linear-gradient(180deg,rgba(245,255,250,0.9),rgba(220,248,234,0.78))] p-5 shadow-[0_20px_60px_rgba(52,132,79,0.12)]">
              {highlights.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-[24px] border border-mint/20 bg-white/55 p-5">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/14 text-violet">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-2xl text-slate-900">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
