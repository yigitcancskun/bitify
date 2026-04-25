"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getNextFlowPath, type FlowStep } from "@/lib/flow";

export function FlowFooter({
  step,
  nextPath = getNextFlowPath(step),
  disabled = false
}: {
  step: FlowStep;
  nextPath?: string | null;
  disabled?: boolean;
}) {

  return (
    <section className="glass-panel rounded-[28px] p-4 sm:p-5">
      {nextPath ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
          <div>
            <p className="text-sm text-slate-600">Flow</p>
            <h2 className="text-2xl text-slate-900">Resume to tutorial</h2>
          </div>
          {disabled ? (
            <button
              type="button"
              disabled
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet px-6 font-bold text-white shadow-glow opacity-50"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          ) : (
            <Link
              href={nextPath}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet px-6 font-bold text-white shadow-glow transition hover:scale-[1.01]"
            >
              Continue
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      ) : (
        <div className="flex min-h-14 items-center justify-center rounded-2xl border border-mint/30 bg-mint/15 px-5 text-center text-lg text-slate-900">
          now, you are free.
        </div>
      )}
    </section>
  );
}
