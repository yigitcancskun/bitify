"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserSquare2, ChartLine } from "lucide-react";

const links = [
  { href: "/avatar", label: "Avatar", icon: UserSquare2 },
  { href: "/my-progress", label: "My Progress", icon: ChartLine },
  { href: "/community", label: "Community", icon: Users }
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-ink px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <nav className="glass-panel sticky top-3 z-20 rounded-2xl p-2">
          <ul className="grid grid-cols-3 gap-2">
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
        </nav>
        {children}
      </div>
    </main>
  );
}
