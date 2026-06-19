"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Mission {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  type: string;
  rewards: { experience: number; credits: number; merits: number };
  requirements: { level?: number };
  durationMinutes: number;
  energyCost: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
  legendary: "text-purple-400",
};

export function MissionsPanel() {
  const character = useGameStore((s) => s.character);
  const updateCharacter = useGameStore((s) => s.updateCharacter);
  const addLog = useGameStore((s) => s.addLog);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState(character?.energy ?? 0);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(data.data.missions);
        if (data.data.energy !== undefined) {
          setCurrentEnergy(data.data.energy);
          updateCharacter({ energy: data.data.energy, lastEnergyRegen: data.data.lastEnergyRegen });
        }
      }
    } finally {
      setLoading(false);
    }
  // updateCharacter is stable (Zustand action) — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only re-fetch when location changes, not on every character update.
  // Including `character` in deps would loop: fetchMissions → updateCharacter → character changes → re-fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (character) fetchMissions();
  }, [character?.currentLocation]);

  async function acceptMission(missionId: string, title: string, energyCost: number) {
    setAccepting(missionId);
    try {
      const res = await fetch("/api/missions/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId }),
      });
      const data = await res.json();

      if (!res.ok) {
        addLog(data.error, "error");
        return;
      }

      const d = data.data;
      addLog(d.narrative, d.failed ? "error" : "narrative");

      if (d.failed) {
        addLog(
          `Mission failed: ${title} — +${d.painGained} pain${d.madnessGained > 0 ? `, +${d.madnessGained} MADNESS` : ""}, -${energyCost} EN`,
          "error"
        );
      } else {
        addLog(
          `Completed: ${title} — +${d.rewards.experience} XP, +${d.rewards.credits}¢${d.rewards.merits ? `, +${d.rewards.merits} merits` : ""}, -${energyCost} EN`,
          "success"
        );
        if (d.levelsGained > 0) {
          addLog(`LEVEL UP! You are now level ${d.newLevel}!`, "success");
        }
      }

      updateCharacter(d.character);
      setCurrentEnergy(d.character.energy);
    } catch {
      addLog("Mission failed. Connection error.", "error");
    } finally {
      setAccepting(null);
    }
  }

  if (!character) return null;

  // Gate: Saber form required
  if (character.shadowForm !== "saber") {
    return (
      <Card title="Missions" accent="green">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="text-2xl text-amber-900">◈</div>
          <p className="text-xs font-mono text-gray-500 leading-relaxed max-w-xs">
            Missions are available only to the{" "}
            <span className="text-amber-400 font-bold">Saber</span> form.
          </p>
          <a href="/shadow-form" className="text-[10px] font-mono text-amber-800 hover:text-amber-500 underline underline-offset-2 transition-colors">
            Select Shadow Form →
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`Missions — ${character.currentLocation.replace(/_/g, " ")}`} accent="green">
      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading missions...</p>
      ) : missions.length === 0 ? (
        <p className="text-xs font-mono text-gray-600">
          No missions available here. Travel to another location or increase your level.
        </p>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const canAfford = currentEnergy >= m.energyCost;
            return (
              <div key={m._id} className="border border-gray-800 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-gray-200">{m.title}</span>
                      <span className={`text-xs font-mono uppercase ${DIFFICULTY_COLORS[m.difficulty]}`}>
                        {m.difficulty}
                      </span>
                      <span className="text-xs font-mono text-gray-600 uppercase">{m.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                  <div className="flex gap-3 text-xs font-mono text-gray-500">
                    <span className="text-yellow-500">+{m.rewards.experience} XP</span>
                    <span className="text-cyan-500">+{m.rewards.credits}¢</span>
                    {m.rewards.merits > 0 && (
                      <span className="text-purple-400">+{m.rewards.merits}M</span>
                    )}
                    <span className={canAfford ? "text-green-700" : "text-red-700"}>
                      -{m.energyCost} EN
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="success"
                    loading={accepting === m._id}
                    disabled={!!accepting || !canAfford}
                    onClick={() => acceptMission(m._id, m.title, m.energyCost)}
                    title={!canAfford ? `Need ${m.energyCost} EN` : undefined}
                  >
                    {canAfford ? "Accept" : "Low EN"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
