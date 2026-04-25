"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { AppState } from "@/lib/api";

export function IdentityGate({
  loading,
  error,
  onLogin,
  onRegister
}: {
  loading: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => Promise<AppState | null>;
  onRegister: (username: string, password: string) => Promise<AppState | null>;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = mode === "login" ? await onLogin(username, password) : await onRegister(username, password);
    if (result) router.push("/my-progress");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-10">
      <section className="glass-panel w-full max-w-md rounded-[32px] p-6">
        <div className="mb-8">
          <img src="/bitify.png" alt="Bitify" className="mb-5 h-auto w-36 object-contain" />
          <p className="mt-3 text-slate-700">
            {mode === "login" ? "Log in with your nickname. Easy." : "Create account with your nickname. Easy."}
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-mint/10 p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`h-11 rounded-xl text-sm transition ${
                  mode === item ? "bg-violet text-white shadow-glow" : "text-slate-700 hover:bg-mint/20"
                }`}
              >
                {item === "login" ? "Log in" : "Create account"}
              </button>
            ))}
          </div>
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
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet font-bold shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {mode === "login" ? "Log in" : "Create account"}
          </button>
          {error ? (
            <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{error}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
