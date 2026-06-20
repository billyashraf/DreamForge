"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { StatBar } from "@/components/ui/StatBar";
import { HEALTH_REGEN_RATE } from "@/lib/energy";

const LOCATION_LABELS: Record<string, string> = {
  metapolis: "Metapolis, Moon",
  moon_junkyard: "Moon Junkyard",
  earth: "Earth",
  mars: "Mars",
};

const XP_TO_LEVEL  = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
const REGEN_RATE   = 2;   // must match lib/energy.ts ENERGY_REGEN_RATE
const PAIN_MINUTES = 45;  // minutes for pain to fully recede

export function CharacterPanel() {
  const character = useGameStore((s) => s.character);
  const user = useGameStore((s) => s.user);
  const [now, setNow] = useState(() => Date.now());

  // 1-second tick — needed for live poison HP drain and accurate countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (!character) return null;

  const xpNeeded = XP_TO_LEVEL(character.level);

  // Optimistic energy estimate
  const lastRegen     = character.lastEnergyRegen ? new Date(character.lastEnergyRegen).getTime() : now;
  const minutesSince  = (now - lastRegen) / 60_000;
  const displayEnergy = Math.min(
    character.energy + Math.floor(minutesSince * REGEN_RATE),
    character.maxEnergy
  );
  const minutesToFull = displayEnergy < character.maxEnergy
    ? Math.ceil((character.maxEnergy - displayEnergy) / REGEN_RATE)
    : 0;

  // Poison status — simulate pending damage client-side so HP drains live
  const poisonedUntil = character.poisonedUntil ? new Date(character.poisonedUntil).getTime() : 0;
  const poisonActive  = poisonedUntil > now;
  const poisonMsLeft  = poisonActive ? poisonedUntil - now : 0;
  const poisonHrs     = Math.floor(poisonMsLeft / 3_600_000);
  const poisonMins    = Math.floor((poisonMsLeft % 3_600_000) / 60_000);
  const poisonSecs    = Math.floor((poisonMsLeft % 60_000) / 1_000);
  const poisonLabel   = poisonHrs > 0
    ? `${poisonHrs}h ${poisonMins}m`
    : poisonMins > 0
      ? `${poisonMins}m ${poisonSecs}s`
      : `${poisonSecs}s`;

  // Pending poison ticks since last server-applied tick
  const lastTick        = character.lastPoisonTick ? new Date(character.lastPoisonTick).getTime() : now;
  const effectiveNow    = poisonActive ? Math.min(now, poisonedUntil) : now;
  const pendingPoison   = poisonActive ? Math.floor((effectiveNow - lastTick) / 1_000) * 15 : 0;

  // Optimistic HP regen (only when not poisoned, not dead, not full)
  const lastHpRegen     = character.lastHealthRegen ? new Date(character.lastHealthRegen).getTime() : now;
  const hpRegenMinutes  = (now - lastHpRegen) / 60_000;
  const pendingHpRegen  = (!poisonActive && !character.isDead && character.health < character.maxHealth)
    ? Math.floor(hpRegenMinutes * HEALTH_REGEN_RATE)
    : 0;

  const displayHp = poisonActive
    ? Math.max(0, character.health - pendingPoison)
    : Math.min(character.health + pendingHpRegen, character.maxHealth);

  const minutesToFullHp = displayHp < character.maxHealth && !poisonActive
    ? Math.ceil((character.maxHealth - displayHp) / HEALTH_REGEN_RATE)
    : 0;

  // Optimistic pain regen estimate
  const maxPain        = character.maxPain ?? 100;
  const lastPainUpd    = character.lastPainUpdate ? new Date(character.lastPainUpdate).getTime() : now;
  const painMinutes    = (now - lastPainUpd) / 60_000;
  const displayPain    = Math.max(0, (character.pain ?? 0) - painMinutes * (maxPain / PAIN_MINUTES));
  const madness        = character.madness ?? 0;
  const minutesToClear = displayPain > 0
    ? Math.ceil(displayPain / (maxPain / PAIN_MINUTES))
    : 0;

  return (
    <Card title="Character" accent="cyan">
      <div className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between">
            <Link
            href={`/profile/${character.id}`}
            className="text-lg font-mono font-bold text-cyan-400 hover:underline"
          >
            {character.name}
          </Link>
            <span className="text-xs font-mono text-gray-500">LVL {character.level}</span>
          </div>
          <div className="text-xs font-mono text-gray-600 mt-0.5">
            @{user?.username} · {LOCATION_LABELS[character.currentLocation] ?? character.currentLocation}
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {/* HP — flashes green when poisoned; shows regen when healthy */}
          <div className="space-y-0.5">
            <StatBar
              label="HP"
              value={displayHp}
              max={character.maxHealth}
              color="red"
              flash={poisonActive}
            />
            {!poisonActive && !character.isDead && (
              <div className="flex justify-between text-xs font-mono text-gray-700 pl-8">
                <span>+{HEALTH_REGEN_RATE} HP/min</span>
                <span>
                  {displayHp >= character.maxHealth
                    ? "full"
                    : `full in ${minutesToFullHp}m`}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            <StatBar label="EN" value={displayEnergy} max={character.maxEnergy} color="green" />
            <div className="flex justify-between text-xs font-mono text-gray-700 pl-8">
              <span>+{REGEN_RATE}/min</span>
              <span>{minutesToFull > 0 ? `full in ${minutesToFull}m` : "full"}</span>
            </div>
          </div>
          <StatBar label="XP" value={character.experience % xpNeeded} max={xpNeeded} color="yellow" />
          {/* Pain — only show when > 0 */}
          {displayPain > 0 && (
            <div className="space-y-0.5">
              <StatBar label="PAIN" value={Math.round(displayPain)} max={maxPain} color="orange" />
              <div className="flex justify-between text-xs font-mono text-gray-700 pl-8">
                <span>clears in {minutesToClear}m</span>
              </div>
            </div>
          )}
          {/* Poison — live countdown row */}
          {poisonActive && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <span className="w-16 text-xs font-mono text-green-600 uppercase animate-pulse">
                  Poison
                </span>
                <div className="flex-1 h-1.5 bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-green-700 animate-pulse"
                    style={{ width: "100%", animationDuration: "0.5s" }}
                  />
                </div>
                <span className="w-16 text-xs font-mono text-green-600 text-right tabular-nums">
                  {poisonLabel}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-gray-700 pl-8">
                <span>-15 HP/sec</span>
              </div>
            </div>
          )}
          {/* Madness — always show once earned */}
          {madness > 0 && (
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs font-mono text-purple-500 uppercase">MADNESS</span>
              <div className="flex-1 h-1.5 bg-gray-800 overflow-hidden">
                <div className="h-full bg-purple-600 animate-pulse" style={{ width: "100%" }} />
              </div>
              <span className="w-16 text-xs font-mono text-purple-400 text-right font-bold">
                {madness}
              </span>
            </div>
          )}
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
