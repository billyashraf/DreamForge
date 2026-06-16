"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export function Navbar() {
  const user = useGameStore((s) => s.user);
  const reset = useGameStore((s) => s.reset);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
          <Link href="/guilds" className="hover:text-gray-200 transition-colors">Guilds</Link>
          <Link href="/teams" className="hover:text-gray-200 transition-colors">Teams</Link>
          <Link href="/commit-log" className="hover:text-gray-200 transition-colors text-gray-600">Commit Log</Link>
          {user?.role !== "player" && (
            <Link href="/admin" className="text-red-500 hover:text-red-400 transition-colors">Admin</Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
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
