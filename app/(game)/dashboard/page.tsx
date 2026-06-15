"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { CharacterPanel } from "@/components/game/CharacterPanel";
import { TravelPanel } from "@/components/game/TravelPanel";
import { MissionsPanel } from "@/components/game/MissionsPanel";
import { GameLog } from "@/components/game/GameLog";

export default function DashboardPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter } = useGameStore();

  useEffect(() => {
    async function loadSession() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.data.user);
      setCharacter(data.data.character);

      if (!data.data.character) {
        router.push("/character/create");
      }
    }

    loadSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user || !character) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xs font-mono text-gray-600 animate-pulse">CONNECTING TO METAPOLIS...</div>
      </div>
    );
  }

  const location = character.currentLocation;

  const LOCATION_LORE: Record<string, { title: string; desc: string; color: string }> = {
    metapolis: {
      title: "Metapolis — The Iron Dome City",
      desc: "You stand in the heart of humanity's last great city, sealed beneath the Moon's iron dome. The air hums with generators. Millions of lives intersect here.",
      color: "text-cyan-400",
    },
    moon_junkyard: {
      title: "Moon Junkyard — Outer Wastes",
      desc: "Beyond the dome lies a vast graveyard of metal and machine. Rogue drones patrol endlessly. Only the bold venture here — and only the skilled return.",
      color: "text-yellow-400",
    },
    earth: {
      title: "Earth — The Shattered World",
      desc: "The cradle of humanity, now a battlefield of overgrown ruins and mutated predators. Treasures and horrors lie in equal measure.",
      color: "text-green-400",
    },
    mars: {
      title: "Mars — The Red Battlefield",
      desc: "Dust and blood. The planet of war, where guilds rise and fall with each season. The tournament never stops.",
      color: "text-red-400",
    },
  };

  const lore = LOCATION_LORE[location] ?? LOCATION_LORE.metapolis;

  return (
    <div className="space-y-4">
      <div className="border border-gray-800 bg-gray-950 p-4">
        <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-1">Current Location</div>
        <h2 className={`text-lg font-mono font-bold ${lore.color}`}>{lore.title}</h2>
        <p className="text-sm font-mono text-gray-500 mt-1 leading-relaxed">{lore.desc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <CharacterPanel />
          <TravelPanel />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <MissionsPanel />
          <GameLog />
        </div>
      </div>
    </div>
  );
}
