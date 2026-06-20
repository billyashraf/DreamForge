"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";

interface ReviveStatus {
  hasPotion: boolean;
  onCooldown: boolean;
  cooldownLabel: string;
}

function useReviveStatus(): ReviveStatus {
  const [status, setStatus] = useState<ReviveStatus>({
    hasPotion: false,
    onCooldown: false,
    cooldownLabel: "",
  });

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/inventory");
      if (!res.ok) return;
      const data = await res.json();
      const inv: { itemKey: string; quantity: number }[] = data.data.inventory ?? [];
      const cds: { itemKey: string; expiresAt: string }[] = data.data.itemCooldowns ?? [];

      const slot = inv.find((i) => i.itemKey === "revive_potion");
      if (!slot || slot.quantity <= 0) return;

      const cd = cds.find((c) => c.itemKey === "revive_potion");
      const msLeft = cd ? Math.max(0, new Date(cd.expiresAt).getTime() - Date.now()) : 0;
      const onCooldown = msLeft > 0;
      const mins = Math.floor(msLeft / 60000);
      const secs = Math.floor((msLeft % 60000) / 1000);

      setStatus({
        hasPotion: true,
        onCooldown,
        cooldownLabel: onCooldown ? `${mins}m ${secs}s` : "",
      });
    }
    check();
  }, []);

  return status;
}

export function DeathScreen() {
  const { character, updateCharacter, addLog } = useGameStore();
  const [respawning, setRespawning] = useState(false);
  const [reviving, setReviving] = useState(false);
  const revive = useReviveStatus();

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
      addLog(`Respawned in Metapolis — -${d.xpLost} XP, -${d.creditsLost}¢`, "warning");
    } catch {
      addLog("Respawn failed. Connection error.", "error");
    } finally {
      setRespawning(false);
    }
  }

  async function useRevivePotion() {
    setReviving(true);
    try {
      const res = await fetch("/api/inventory/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: "revive_potion" }),
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(data.error ?? "Revive failed.", "error");
        return;
      }
      updateCharacter(data.data.character);
      addLog("Revive Potion used — back at full HP, poison cleared.", "success");
    } catch {
      addLog("Revive failed. Connection error.", "error");
    } finally {
      setReviving(false);
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

        <div className="border-t border-red-950" />

        {/* Revive Potion section */}
        {revive.hasPotion && (
          <div className="border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="text-xs font-mono text-white/60 uppercase tracking-wider">
              🤍 Revive Potion available
            </div>
            <p className="text-[10px] font-mono text-gray-500">
              Revive at full HP with no XP or credit penalty. Poison is cleared.
            </p>
            <Button
              variant="secondary"
              className="w-full border-white/20 text-white/70"
              loading={reviving}
              disabled={revive.onCooldown || reviving}
              onClick={useRevivePotion}
            >
              {revive.onCooldown
                ? `Cooldown: ${revive.cooldownLabel}`
                : "Use Revive Potion"}
            </Button>
          </div>
        )}

        {/* Respawn penalties */}
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
