"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { canTravelTo } from "@/lib/shadowForms";

const DESTINATIONS = [
  {
    id: "metapolis",
    label: "Metapolis",
    world: "Moon",
    cost: 0,
    levelReq: 1,
    description: "The iron dome megacity. Home base.",
    accent: "text-cyan-400",
  },
  {
    id: "moon_junkyard",
    label: "Moon Junkyard",
    world: "Moon",
    cost: 0,
    levelReq: 1,
    description: "Dangerous scrapyard. Scavenging & expeditions.",
    accent: "text-yellow-400",
  },
  {
    id: "earth",
    label: "Earth",
    world: "Earth",
    cost: 200,
    levelReq: 5,
    description: "Post-apocalyptic wasteland. Story missions.",
    accent: "text-green-400",
  },
  {
    id: "mars",
    label: "Mars",
    world: "Mars",
    cost: 350,
    levelReq: 10,
    description: "Battle royale & guild wars.",
    accent: "text-red-400",
  },
];

export function TravelPanel() {
  const character = useGameStore((s) => s.character);
  const updateCharacter = useGameStore((s) => s.updateCharacter);
  const addLog = useGameStore((s) => s.addLog);
  const [loading, setLoading] = useState<string | null>(null);

  if (!character) return null;

  const shadowForm = character.shadowForm ?? null;

  async function travel(destination: string) {
    setLoading(destination);
    try {
      const res = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      const data = await res.json();

      if (!res.ok) {
        addLog(data.error, "error");
        return;
      }

      updateCharacter({
        currentLocation: data.data.location,
        credits: data.data.creditsRemaining,
      });
      addLog(data.data.message, "narrative");
    } catch {
      addLog("Travel failed. Connection error.", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card title="Travel Gates" accent="yellow">
      <div className="space-y-2">
        {DESTINATIONS.map((dest) => {
          const isHere      = character.currentLocation === dest.id;
          const canAfford   = character.credits >= dest.cost;
          const meetsLevel  = character.level >= dest.levelReq;
          const formAllowed = canTravelTo(shadowForm, dest.id);
          const blocked     = !formAllowed;

          const FORM_HINT: Record<string, string> = {
            moon_junkyard: "Archer · Assassin",
            earth:         "Archer · Assassin",
            mars:          "Caster · Berserker · Assassin",
          };

          return (
            <div key={dest.id} className={`flex items-center gap-3 p-2 border ${isHere ? "border-gray-600 bg-gray-900" : blocked ? "border-gray-900 opacity-50" : "border-gray-800"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-medium ${blocked ? "text-gray-700" : dest.accent}`}>{dest.label}</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{dest.world}</span>
                  {isHere && <span className="text-xs font-mono text-cyan-600">[HERE]</span>}
                  {blocked && <span className="text-xs font-mono text-gray-700">[LOCKED]</span>}
                </div>
                <p className="text-xs text-gray-600 mt-0.5 truncate">{dest.description}</p>
                <div className="flex gap-3 mt-1 flex-wrap">
                  {dest.cost > 0 && !blocked && (
                    <span className={`text-xs font-mono ${canAfford ? "text-gray-500" : "text-red-600"}`}>
                      {dest.cost}¢
                    </span>
                  )}
                  {dest.levelReq > 1 && !blocked && (
                    <span className={`text-xs font-mono ${meetsLevel ? "text-gray-500" : "text-red-600"}`}>
                      LVL {dest.levelReq}+
                    </span>
                  )}
                  {blocked && FORM_HINT[dest.id] && (
                    <span className="text-xs font-mono text-gray-700">
                      Requires: {FORM_HINT[dest.id]}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={isHere ? "ghost" : "secondary"}
                disabled={isHere || !canAfford || !meetsLevel || blocked}
                loading={loading === dest.id}
                onClick={() => travel(dest.id)}
                title={blocked ? `Requires ${FORM_HINT[dest.id] ?? "specific"} form` : undefined}
              >
                {isHere ? "HERE" : blocked ? "LOCKED" : "GO"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
