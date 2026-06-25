"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";

interface Stats {
  totalUsers: number;
  totalCharacters: number;
  totalMissions: number;
  totalGuilds: number;
  totalTeams: number;
  bannedUsers: number;
  onlineLast24h: number;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) {
        const r = await fetch("/api/auth/me");
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
        if (d.data.user.role === "player") { router.push("/dashboard"); return; }
      } else if (user.role === "player") {
        router.push("/dashboard");
        return;
      }

      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    }
    load();
  }, [user, router, setUser, setCharacter]);

  if (!stats) {
    return <div className="text-xs font-mono text-gray-600 animate-pulse">Loading stats...</div>;
  }

  const tiles = [
    { label: "Total Users", value: stats.totalUsers, color: "text-cyan-400" },
    { label: "Characters", value: stats.totalCharacters, color: "text-green-400" },
    { label: "Active Missions", value: stats.totalMissions, color: "text-yellow-400" },
    { label: "Guilds", value: stats.totalGuilds, color: "text-purple-400" },
    { label: "Teams", value: stats.totalTeams, color: "text-blue-400" },
    { label: "Banned Users", value: stats.bannedUsers, color: "text-red-400" },
    { label: "Online (24h)", value: stats.onlineLast24h, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-mono font-bold text-red-400">Admin Overview</h1>
        <p className="text-xs font-mono text-gray-600 mt-1">Game analytics and system health</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <div className="text-xs font-mono text-gray-600 uppercase">{t.label}</div>
            <div className={`text-2xl font-mono font-bold mt-1 ${t.color}`}>{t.value.toLocaleString()}</div>
          </Card>
        ))}
      </div>

      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <a href="/admin/users" className="p-3 border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-gray-200 transition-colors">
            Manage Users →
          </a>
          <a href="/admin/missions" className="p-3 border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-gray-200 transition-colors">
            Manage Missions →
          </a>
          <a href="/admin/guilds" className="p-3 border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-gray-200 transition-colors">
            Manage Guilds →
          </a>
          <a href="/admin/teams" className="p-3 border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-gray-200 transition-colors">
            Manage Teams →
          </a>
        </div>
      </Card>
    </div>
  );
}
