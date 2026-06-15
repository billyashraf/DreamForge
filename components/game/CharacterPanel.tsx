"use client";

import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { StatBar } from "@/components/ui/StatBar";

const LOCATION_LABELS: Record<string, string> = {
  metapolis: "Metapolis, Moon",
  moon_junkyard: "Moon Junkyard",
  earth: "Earth",
  mars: "Mars",
};

const XP_TO_LEVEL = (level: number) => Math.floor(100 * Math.pow(level, 1.5));

export function CharacterPanel() {
  const character = useGameStore((s) => s.character);
  const user = useGameStore((s) => s.user);

  if (!character) return null;

  const xpNeeded = XP_TO_LEVEL(character.level);

  return (
    <Card title="Character" accent="cyan">
      <div className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-cyan-400">{character.name}</span>
            <span className="text-xs font-mono text-gray-500">LVL {character.level}</span>
          </div>
          <div className="text-xs font-mono text-gray-600 mt-0.5">
            @{user?.username} · {LOCATION_LABELS[character.currentLocation] ?? character.currentLocation}
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <StatBar label="HP" value={character.health} max={character.maxHealth} color="red" />
          <StatBar label="EN" value={character.energy} max={character.maxEnergy} color="green" />
          <StatBar label="XP" value={character.experience % xpNeeded} max={xpNeeded} color="yellow" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-gray-800">
          <StatRow label="Credits" value={`${character.credits}¢`} />
          <StatRow label="STR" value={character.strength} />
          <StatRow label="INT" value={character.intelligence} />
          <StatRow label="AGI" value={character.agility} />
        </div>
      </div>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-mono text-gray-600">{label}</span>
      <span className="text-xs font-mono text-gray-300">{value}</span>
    </div>
  );
}
