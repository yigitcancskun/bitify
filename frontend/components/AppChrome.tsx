"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, LogOut, UserRound, Users, UserSquare2 } from "lucide-react";
import { clearFitnessSession, useFitnessSession } from "@/lib/session";

const links = [
  { href: "/my-progress", label: "My Progress", icon: ChartLine },
  { href: "/community", label: "Community", icon: Users }
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useFitnessSession();

  return (
    <main className="min-h-screen bg-ink px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <nav className="glass-panel sticky top-3 z-20 rounded-2xl p-2">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <div>
              <Link
                href="/"
                aria-label="Go to Bitify start"
                className="flex h-full min-h-10 items-center justify-center rounded-xl px-3 py-2 transition hover:bg-violet/10"
              >
                <img src="/bitify.png" alt="Bitify" className="h-8 w-auto max-w-[92px] object-contain" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {links.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                        active
                          ? "bg-violet text-white shadow-glow"
                          : "text-slate-700 hover:bg-violet/10 hover:text-violet"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="group relative">
              <button
                type="button"
                className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-violet/10 hover:text-violet"
              >
                <UserRound size={16} />
                <span className="hidden md:inline">{state?.profile.username ?? "Profile"}</span>
              </button>
              <div className="invisible absolute right-0 top-full z-20 h-6 w-48 group-focus-within:visible group-hover:visible" />
              <div className="invisible absolute right-0 top-full z-30 mt-1 w-48 rounded-2xl border border-mint/25 bg-white/95 p-2 opacity-0 shadow-xl transition duration-300 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <p className="truncate px-3 py-2 text-xs text-slate-600">{state?.profile.username ?? "My profile"}</p>
                <Link
                  href="/avatar"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-mint/20"
                >
                  <UserSquare2 size={15} />
                  Avatar
                </Link>
                <Link
                  href="/auth"
                  onClick={clearFitnessSession}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-mint/20"
                >
                  <LogOut size={15} />
                  Log out
                </Link>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </div>
    </main>
  );
}
