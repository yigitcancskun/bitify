"use client";

import { Check, CreditCard, Loader2, Rocket, Ruler, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { completeProfile } from "@/lib/api";
import { hasCompletedProfile, hasCreatedAvatar } from "@/lib/flow";
import { useFitnessSession } from "@/lib/session";

type FlowStep = "profile" | "pricing";
type PlanKey = "7d" | "30d" | "90d" | "180d";

const plans: Array<{ key: PlanKey; label: string; price: string; cta: string }> = [
  { key: "7d", label: "7 days", price: "Free", cta: "Start free" },
  { key: "30d", label: "30 days", price: "$9.99", cta: "Choose plan" },
  { key: "90d", label: "90 days", price: "$19.99", cta: "Choose plan" },
  { key: "180d", label: "180 days", price: "$29.99", cta: "Choose plan" }
];

const featureAvailability: Array<{ label: string; plans: Record<PlanKey, boolean> }> = [
  {
    label: "AI-personalized coaching",
    plans: { "7d": false, "30d": true, "90d": true, "180d": true }
  },
  {
    label: "Avatar evolution updates",
    plans: { "7d": true, "30d": true, "90d": true, "180d": true }
  },
  {
    label: "Workout and calorie tracking",
    plans: { "7d": false, "30d": true, "90d": true, "180d": true }
  },
  {
    label: "Leaderboard accountability",
    plans: { "7d": true, "30d": true, "90d": true, "180d": true }
  }
];

export default function FlowPage() {
  const router = useRouter();
  const { state, setState, booting, error, setError } = useFitnessSession();
  const [step, setStep] = useState<FlowStep>("profile");
  const [age, setAge] = useState("24");
  const [heightCm, setHeightCm] = useState("175");
  const [weightKg, setWeightKg] = useState("72");
  const [profileTouched, setProfileTouched] = useState({ age: false, height: false, weight: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [startingPlan, setStartingPlan] = useState<PlanKey | null>(null);
  const pricingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (booting) return;
    if (!state) {
      router.replace("/auth");
      return;
    }
    if (hasCreatedAvatar(state)) {
      router.replace("/my-progress");
      return;
    }
    if (hasCompletedProfile(state)) {
      setStep("pricing");
    }
  }, [booting, router, state]);

  useEffect(() => {
    if (!state?.profile) return;
    if (state.profile.age) setAge(String(state.profile.age));
    if (state.profile.height_cm) setHeightCm(String(state.profile.height_cm));
    if (state.profile.weight_kg) setWeightKg(String(state.profile.weight_kg));
  }, [state?.profile]);

  const bmi = useMemo(() => {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!height || !weight) return null;
    const meter = height / 100;
    if (!meter) return null;
    return weight / (meter * meter);
  }, [heightCm, weightKg]);

  const profileValid = useMemo(() => {
    const ageValue = Number(age);
    const heightValue = Number(heightCm);
    const weightValue = Number(weightKg);
    return (
      Number.isFinite(ageValue) &&
      Number.isFinite(heightValue) &&
      Number.isFinite(weightValue) &&
      ageValue >= 13 &&
      ageValue <= 100 &&
      heightValue >= 100 &&
      heightValue <= 260 &&
      weightValue >= 30 &&
      weightValue <= 300
    );
  }, [age, heightCm, weightKg]);

  useEffect(() => {
    if (step !== "pricing") return;
    const timeout = window.setTimeout(() => {
      pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [step]);

  async function handleSaveMetrics() {
    if (!state || savingProfile) return;

    setProfileTouched({ age: true, height: true, weight: true });

    if (!profileValid) {
      setError("Please enter valid age, height, and weight values before continuing.");
      return;
    }

    setSavingProfile(true);
    setError(null);

    try {
      const nextState = await completeProfile({
        userId: state.profile.id,
        age: Number(age),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg)
      });
      setState(nextState);
      setStep("pricing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePlanSelect(planKey: PlanKey) {
    setStartingPlan(planKey);
    window.setTimeout(() => {
      router.push("/avatar");
    }, 950);
  }

  if (booting) return <main className="min-h-screen bg-ink" />;
  if (!state) return <main className="min-h-screen bg-ink" />;

  return (
    <AppChrome>
      <section className="glass-panel rounded-[32px] p-4 sm:p-5">
        <div className="grid gap-4">
          <section className="rounded-[28px] border border-mint/20 bg-white/45 p-4 shadow-[0_18px_40px_rgba(52,132,79,0.1)] sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/12 text-violet">
                {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Ruler size={18} />}
              </div>
              <div>
                <p className="text-sm text-slate-600">Step 1</p>
                <h2 className="text-2xl text-slate-900">Tell us your body metrics</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm text-slate-700">Age</span>
                <input
                  value={age}
                  onChange={(event) => {
                    setAge(event.target.value);
                    setProfileTouched((current) => ({ ...current, age: true }));
                  }}
                  type="number"
                  min={13}
                  max={100}
                  className="h-14 rounded-2xl border border-mint/25 bg-mint/15 px-4 text-slate-900 outline-none transition focus:border-violet"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-slate-700">Height (cm)</span>
                <input
                  value={heightCm}
                  onChange={(event) => {
                    setHeightCm(event.target.value);
                    setProfileTouched((current) => ({ ...current, height: true }));
                  }}
                  type="number"
                  min={100}
                  max={260}
                  className="h-14 rounded-2xl border border-mint/25 bg-mint/15 px-4 text-slate-900 outline-none transition focus:border-violet"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-slate-700">Weight (kg)</span>
                <input
                  value={weightKg}
                  onChange={(event) => {
                    setWeightKg(event.target.value);
                    setProfileTouched((current) => ({ ...current, weight: true }));
                  }}
                  type="number"
                  min={30}
                  max={300}
                  className="h-14 rounded-2xl border border-mint/25 bg-mint/15 px-4 text-slate-900 outline-none transition focus:border-violet"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mint/15 bg-mint/10 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Rocket size={16} className="text-violet" />
                <span>{savingProfile ? "Saving your metrics..." : "Save your metrics to unlock the next step."}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-mint/20 bg-white/50 px-3 py-1 text-sm text-slate-900">
                  Current BMI: {bmi ? bmi.toFixed(1) : "-"}
                </div>
                <button
                  type="button"
                  onClick={handleSaveMetrics}
                  disabled={savingProfile}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-violet px-5 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingProfile ? <Loader2 className="animate-spin" size={16} /> : null}
                  {savingProfile ? "Saving..." : "Save metrics"}
                </button>
              </div>
            </div>
            {error ? (
              <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-900">{error}</p>
            ) : null}
          </section>

          <section
            ref={pricingRef}
            className={`rounded-[28px] border border-mint/20 bg-white/45 p-4 shadow-[0_18px_40px_rgba(52,132,79,0.1)] transition-all duration-700 sm:p-5 ${
              step === "pricing" ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-40"
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/12 text-violet">
                <CreditCard size={18} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Step 2</p>
                <h2 className="text-2xl text-slate-900">Choose your plan</h2>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-mint/20">
              <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] border-b border-mint/20 bg-mint/10">
                <div className="p-4 text-sm uppercase tracking-[0.16em] text-slate-600">Feature checklist</div>
                {plans.map((plan) => (
                  <div key={plan.key} className="border-l border-mint/20 p-4 text-center">
                    <p className="text-sm text-slate-600">{plan.label}</p>
                    <p className="mt-1 text-2xl text-slate-900">{plan.price}</p>
                  </div>
                ))}
              </div>

              {featureAvailability.map((feature) => (
                <div key={feature.label} className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] border-b border-mint/15 last:border-b-0">
                  <div className="p-4">
                    <p className="text-lg text-slate-900">{feature.label}</p>
                  </div>
                  {plans.map((plan) => (
                    <div
                      key={`${feature.label}-${plan.key}`}
                      className={`flex items-center justify-center border-l border-mint/15 p-4 ${
                        feature.plans[plan.key] ? "text-violet" : "text-rose-500"
                      }`}
                    >
                      {feature.plans[plan.key] ? <Check size={18} /> : <X size={18} />}
                    </div>
                  ))}
                </div>
              ))}

              <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] bg-white/40">
                <div className="p-4 text-sm text-slate-600">Pick your package to begin the tutorial flow.</div>
                {plans.map((plan) => (
                  <div key={plan.key} className="border-l border-mint/15 p-3">
                    <button
                      type="button"
                      onClick={() => handlePlanSelect(plan.key)}
                      disabled={Boolean(startingPlan)}
                      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold transition ${
                        startingPlan === plan.key
                          ? "scale-[0.98] bg-violet text-white"
                          : "bg-mint/75 text-slate-900 hover:scale-[1.01]"
                      } disabled:opacity-70`}
                    >
                      {startingPlan === plan.key ? <Loader2 className="animate-spin" size={16} /> : null}
                      {plan.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </AppChrome>
  );
}
