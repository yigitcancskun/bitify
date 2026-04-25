"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FlowFooter } from "@/components/FlowFooter";
import { IdentityGate } from "@/components/IdentityGate";
import { getPostAuthPath } from "@/lib/flow";
import { useFitnessSession } from "@/lib/session";

export default function AuthPage() {
  const router = useRouter();
  const { state, booting, loading, error, login, register } = useFitnessSession();

  useEffect(() => {
    if (booting || !state) return;
    router.replace(getPostAuthPath(state));
  }, [booting, router, state]);

  if (booting) return <main className="min-h-screen bg-ink" />;

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <IdentityGate loading={loading} error={error} onLogin={login} onRegister={register} redirectTo="/avatar" />
        <FlowFooter step="auth" nextPath={state ? "/avatar" : "/auth"} disabled={!state} />
      </div>
    </div>
  );
}
