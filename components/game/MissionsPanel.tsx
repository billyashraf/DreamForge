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
  rewards: { experience: number; credits: number };
  requirements: { level?: number };
  durationMinutes: number;
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

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(data.data.missions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (character) fetchMissions();
  }, [character?.currentLocation, fetchMissions, character]);

  async function acceptMission(missionId: string, title: string) {
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
      addLog(d.narrative, "narrative");
      addLog(
        `Completed: ${title} — +${d.rewards.experience} XP, +${d.rewards.credits}¢`,
        "success"
      );

      if (d.leveledUp) {
        addLog(`LEVEL UP! You are now level ${d.newLevel}!`, "success");
      }

      updateCharacter(d.character);
      await fetchMissions();
    } catch {
      addLog("Mission failed. Connection error.", "error");
    } finally {
      setAccepting(null);
    }
  }

  if (!character) return null;

  return (
    <Card title={`Missions — ${character.currentLocation.replace("_", " ")}`} accent="green">
      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading missions...</p>
      ) : missions.length === 0 ? (
        <p className="text-xs font-mono text-gray-600">
          No missions available here. Try a different location or increase your level.
        </p>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
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
                  <span className="text-gray-600">{m.durationMinutes}min</span>
                </div>
                <Button
                  size="sm"
                  variant="success"
                  loading={accepting === m._id}
                  disabled={!!accepting}
                  onClick={() => acceptMission(m._id, m.title)}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
