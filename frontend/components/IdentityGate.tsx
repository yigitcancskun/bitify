"use client";

import { Loader2, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export function IdentityGate({
  loading,
  error,
  onStart
}: {
  loading: boolean;
  error: string | null;
  onStart: (username: string) => void;
}) {
  const [username, setUsername] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onStart(username);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-10">
      <section className="glass-panel w-full max-w-md rounded-[32px] p-6">
        <div className="mb-8">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet text-white shadow-glow">
            <UserRound size={26} />
          </div>
          <h1 className="text-4xl font-black leading-tight">bitify</h1>
          <p className="mt-3 text-slate-700">Create your anonymous fitness identity and start your avatar evolution.</p>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-slate-700">Anonymous username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Shadow_427"
              className="h-14 rounded-2xl border border-mint/25 bg-mint/15 px-4 text-slate-900 outline-none transition focus:border-violet"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet font-bold shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            Start anonymous
          </button>
          {error ? (
            <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{error}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
