"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export function Navbar() {
  const user       = useGameStore((s) => s.user);
  const character  = useGameStore((s) => s.character);
  const reset      = useGameStore((s) => s.reset);
  const router     = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const shadowForm = character?.shadowForm ?? null;
  const canAcademy    = shadowForm === "rider"    || shadowForm === "assassin";
  const canCommitLog  = shadowForm === "lancer"   || shadowForm === "assassin";
  const canGuilds     = shadowForm === "caster"   || shadowForm === "assassin";

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    reset();
    router.push("/login");
  }

  return (
    <nav className="bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-mono font-bold text-cyan-400 text-lg tracking-tight">
          DREAM<span className="text-gray-500">FORGE</span>
        </Link>
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-200 transition-colors">Dashboard</Link>
          {/* Guilds — Caster / Assassin */}
          {canGuilds ? (
            <Link href="/guilds" className="hover:text-gray-200 transition-colors">Guilds</Link>
          ) : (
            <span
              title="Requires Caster or Assassin form"
              className="text-gray-800 cursor-not-allowed select-none"
            >
              Guilds
            </span>
          )}
          <Link href="/teams" className="hover:text-gray-200 transition-colors">Teams</Link>
          <Link href="/people" className="hover:text-gray-200 transition-colors">People</Link>

          {/* Commit Log — Lancer / Assassin */}
          {canCommitLog ? (
            <Link href="/commit-log" className="hover:text-gray-200 transition-colors text-gray-600">
              Commit Log
            </Link>
          ) : (
            <span
              title="Requires Lancer or Assassin form"
              className="text-gray-800 cursor-not-allowed select-none"
            >
              Commit Log
            </span>
          )}

          <Link href="/curse-tree" className="hover:text-purple-300 transition-colors text-purple-600 font-semibold">
            Curse Tree
          </Link>

          {/* Academy — Rider only */}
          {canAcademy ? (
            <Link href="/academy" className="hover:text-amber-300 transition-colors text-amber-600 font-semibold">
              Academy
            </Link>
          ) : (
            <span
              title="Requires Rider form"
              className="text-yellow-900 cursor-not-allowed select-none font-semibold"
            >
              Academy
            </span>
          )}

          {/* Shadow Form */}
          <Link href="/shadow-form" className="hover:text-indigo-300 transition-colors text-indigo-600 font-semibold">
            Shadow Form
          </Link>

          {user?.role !== "player" && (
            <Link href="/admin" className="text-red-500 hover:text-red-400 transition-colors">Admin</Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {shadowForm && (
          <span className="text-[10px] font-mono text-gray-700 hidden sm:block uppercase tracking-widest">
            ◆ {shadowForm}
          </span>
        )}
        {user && (
          <span className="text-xs font-mono text-gray-600 hidden sm:block">
            [{user.role.toUpperCase()}] {user.username}
          </span>
        )}
        <button
          onClick={logout}
          disabled={loggingOut}
          className="text-xs font-mono text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          LOGOUT
        </button>
      </div>
    </nav>
  );
}
