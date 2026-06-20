"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";

export function DeathScreen() {
  const { character, updateCharacter, addLog } = useGameStore();
  const [respawning, setRespawning] = useState(false);

  async function respawn() {
    setRespawning(true);
    try {
      const res = await fetch("/api/respawn", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        addLog(data.error ?? "Respawn failed.", "error");
        return;
      }
      const d = data.data;
      updateCharacter(d.character);
      addLog(
        `Respawned in Metapolis — -${d.xpLost} XP, -${d.creditsLost}¢`,
        "warning"
      );
    } catch {
      addLog("Respawn failed. Connection error.", "error");
    } finally {
      setRespawning(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="border border-red-900 bg-gray-950 p-8 max-w-sm w-full space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-red-900 text-xs font-mono tracking-[0.4em] uppercase">
            ── FALLEN ──
          </div>
          <h1 className="text-5xl font-mono font-bold text-red-600 tracking-widest">
            DEAD
          </h1>
          <p className="text-xs font-mono text-gray-600">
            {character?.name ?? "You"} has been defeated.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-red-950" />

        {/* Penalties */}
        <div className="space-y-3">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest">
            Respawn penalties
          </div>
          <div className="space-y-2">
            <PenaltyRow icon="◈" label="Location" value="Metapolis" />
            <PenaltyRow icon="◈" label="Health" value="Wake at 30% HP" />
            <PenaltyRow icon="◈" label="Pain" value="Cleared" color="text-green-800" />
            <PenaltyRow icon="◈" label="Experience" value="−10% XP" />
            <PenaltyRow icon="◈" label="Credits" value="−10% credits" />
          </div>
        </div>

        {/* Respawn button */}
        <Button
          variant="danger"
          className="w-full"
          loading={respawning}
          onClick={respawn}
        >
          {respawning ? "Waking up..." : "Wake Up"}
        </Button>
      </div>
    </div>
  );
}

function PenaltyRow({
  icon,
  label,
  value,
  color = "text-red-800",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="text-red-900">{icon}</span>
      <span className="text-gray-600 w-24">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
