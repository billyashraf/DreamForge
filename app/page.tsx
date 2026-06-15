"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export default function Home() {
  const router = useRouter();
  const { setUser, setCharacter } = useGameStore();
  const [demoLoading, setDemoLoading] = useState<"player" | "admin" | null>(null);
  const [demoError, setDemoError] = useState("");

  async function playDemo(type: "player" | "admin") {
    setDemoLoading(type);
    setDemoError("");
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDemoError(data.error ?? "Demo unavailable. Try again shortly.");
        return;
      }
      setUser(data.data.user);
      setCharacter(data.data.character);
      router.push(type === "admin" ? "/admin" : "/dashboard");
    } catch {
      setDemoError("Connection error. Is the server running?");
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6 text-center">

        {/* Header */}
        <div className="space-y-1">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest">
            Text-Based MMORPG &middot; Moon &middot; Earth &middot; Mars
          </div>
          <h1 className="text-5xl font-mono font-bold tracking-tight">
            <span className="text-cyan-400">DREAME</span>
            <span className="text-gray-500">FORGE</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm leading-relaxed pt-1">
            Build your legend across three worlds.<br />
            Survive the Moon Junkyard. Explore post-apocalyptic Earth.<br />
            Dominate the Mars Battle Royale.
          </p>
        </div>

        {/* Demo Access — primary CTA */}
        <div className="border border-yellow-900 bg-yellow-950/30 p-5 text-left space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-yellow-400 uppercase tracking-widest font-bold">
              Live Demo — No Registration Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Player demo */}
            <div className="border border-gray-700 bg-gray-900 p-4 space-y-3">
              <div>
                <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">Player Demo</div>
                <div className="text-sm font-mono text-cyan-400 font-bold mt-0.5">Nova &mdash; Level 8</div>
                <div className="text-xs font-mono text-gray-600 mt-1">
                  Moon Junkyard &middot; Guild: Iron Vanguard
                </div>
              </div>
              <div className="text-xs font-mono text-gray-600 space-y-0.5">
                <div>Email: <span className="text-gray-400">demo@dreameforge.com</span></div>
                <div>Pass: <span className="text-gray-400">DemoPlay3r!</span></div>
              </div>
              <button
                onClick={() => playDemo("player")}
                disabled={!!demoLoading}
                className="w-full px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-mono text-sm transition-colors border border-cyan-600 flex items-center justify-center gap-2"
              >
                {demoLoading === "player" && (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                PLAY AS NOVA
              </button>
            </div>

            {/* Admin demo */}
            <div className="border border-red-900 bg-gray-900 p-4 space-y-3">
              <div>
                <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">Admin Demo</div>
                <div className="text-sm font-mono text-red-400 font-bold mt-0.5">Overseer &mdash; Level 20</div>
                <div className="text-xs font-mono text-gray-600 mt-1">
                  Mars &middot; Role: Administrator
                </div>
              </div>
              <div className="text-xs font-mono text-gray-600 space-y-0.5">
                <div>Email: <span className="text-gray-400">admin@dreameforge.com</span></div>
                <div>Pass: <span className="text-gray-400">AdminF0rge!</span></div>
              </div>
              <button
                onClick={() => playDemo("admin")}
                disabled={!!demoLoading}
                className="w-full px-4 py-2 bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-100 font-mono text-sm transition-colors border border-red-800 flex items-center justify-center gap-2"
              >
                {demoLoading === "admin" && (
                  <span className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                )}
                ENTER ADMIN PANEL
              </button>
            </div>
          </div>

          {demoError && (
            <div className="text-xs font-mono text-red-400 border border-red-900 bg-red-950 p-2">
              ERROR: {demoError}
            </div>
          )}
        </div>

        {/* Server status */}
        <div className="border border-gray-800 p-4 text-left font-mono text-xs">
          <div className="text-gray-600 uppercase tracking-widest mb-3">System Status</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex justify-between"><span className="text-gray-600">Server</span><span className="text-green-400">ONLINE</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Season</span><span className="text-yellow-400">Season 1</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Metapolis</span><span className="text-cyan-400">ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Mars Arena</span><span className="text-red-400">LIVE</span></div>
          </div>
        </div>

        {/* Register / Login */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 font-mono text-sm transition-colors border border-gray-700"
          >
            CREATE ACCOUNT
          </Link>
          <Link
            href="/login"
            className="px-8 py-2.5 bg-transparent hover:bg-gray-900 text-gray-500 font-mono text-sm transition-colors border border-gray-800"
          >
            LOGIN
          </Link>
        </div>

        {/* World blurbs */}
        <div className="grid grid-cols-3 gap-3 text-left">
          {[
            { world: "Moon", tag: "Home Base", desc: "Train, trade, and take missions in the iron dome city." },
            { world: "Earth", tag: "Exploration", desc: "Story missions across a post-apocalyptic wasteland." },
            { world: "Mars", tag: "PvP & Guilds", desc: "Battle royale and guild territory wars. Season 1." },
          ].map((w) => (
            <div key={w.world} className="border border-gray-800 p-3">
              <div className="text-xs font-mono text-gray-600 uppercase">{w.tag}</div>
              <div className="text-sm font-mono text-gray-200 mt-0.5">{w.world}</div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-gray-700">
          <span>&copy; {new Date().getFullYear()} DreameForge</span>
          <a
            href="https://github.com/billyashraf/DreameForge"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-500 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
