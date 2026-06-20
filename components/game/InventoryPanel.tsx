"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameStore, InvItem, ItemCooldown } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";

const ITEM_META: Record<string, { icon: string; border: string; glow: string; level?: string }> = {
  sedative:     { icon: "💊", border: "border-purple-700", glow: "shadow-purple-900/50" },
  meat:         { icon: "🥩", border: "border-orange-700", glow: "shadow-orange-900/50" },
  red_potion_1: { icon: "🧪", border: "border-red-900",   glow: "shadow-red-900/40",  level: "I"   },
  red_potion_2: { icon: "🧪", border: "border-red-700",   glow: "shadow-red-800/50",  level: "II"  },
  red_potion_3: { icon: "🧪", border: "border-red-500",   glow: "shadow-red-700/60",  level: "III" },
  revive_potion: { icon: "🤍", border: "border-white/20",  glow: "shadow-white/10" },
  black_potion:  { icon: "🖤", border: "border-gray-600",  glow: "shadow-gray-900/80" },
};

const RARITY_COLORS: Record<string, string> = {
  common:    "text-gray-400",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  epic:      "text-purple-400",
  legendary: "text-yellow-400",
};

function formatMs(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatEffect(effect: string | null, value: number): string {
  if (effect === "pain_reduce") return `-${value} Pain`;
  if (effect === "energy_add") return `+${value} EN`;
  if (effect === "health_add") return `+${value} HP`;
  return "";
}

export function InventoryPanel() {
  const { character, updateCharacter, addLog } = useGameStore();
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [cooldowns, setCooldowns] = useState<ItemCooldown[]>([]);
  const [consuming, setConsuming] = useState<Record<string, number>>({});
  const [using, setUsing] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const consumingRef = useRef(consuming);
  consumingRef.current = consuming;

  // Tick every second for cooldown + consume timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Consume countdown tick
  useEffect(() => {
    if (Object.keys(consuming).length === 0) return;
    const id = setInterval(() => {
      setConsuming((prev) => {
        const next: Record<string, number> = {};
        for (const [key, secs] of Object.entries(prev)) {
          if (secs > 1) next[key] = secs - 1;
          // drop when reaches 0
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [Object.keys(consuming).join(",")]);

  const fetchInventory = useCallback(async () => {
    const res = await fetch("/api/inventory");
    if (!res.ok) return;
    const data = await res.json();
    setInventory(data.data.inventory ?? []);
    setCooldowns(data.data.itemCooldowns ?? []);
  }, []);

  // Fetch on mount — this component is only rendered when character is set
  useEffect(() => {
    fetchInventory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function useItem(item: InvItem) {
    if (using) return;
    setUsing(item.itemKey);
    try {
      const res = await fetch("/api/inventory/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.itemKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(data.error, "error");
        return;
      }
      const d = data.data;

      if (d.consumeTimeMinutes > 0) {
        setConsuming((prev) => ({ ...prev, [item.itemKey]: d.consumeTimeMinutes * 60 }));
      }

      updateCharacter(d.character);
      setInventory(d.inventory);
      setCooldowns(d.itemCooldowns ?? []);

      // For black potion use the server's outcome message; otherwise format the effect
      if (d.outcomeKey) {
        addLog(d.message, d.outcomeKey === "death" || d.outcomeKey === "poisoned" ? "error" : "success");
      } else {
        const effectLabel = formatEffect(item.effect, item.effectValue);
        addLog(`Used ${item.name}${effectLabel ? ` — ${effectLabel}` : ""}`, "success");
      }
    } catch {
      addLog("Failed to use item.", "error");
    } finally {
      setUsing(null);
    }
  }

  if (!character) return null;
  const visible = inventory.filter((i) => i.quantity > 0);

  if (visible.length === 0) {
    return (
      <Card title="Inventory" accent="yellow">
        <p className="text-xs font-mono text-gray-600">
          No items. Run <span className="text-yellow-700">POST /api/seed</span> to stock up.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Inventory" accent="yellow">
      <div className="flex flex-wrap gap-3">
        {visible.map((item) => {
          const meta = ITEM_META[item.itemKey] ?? { icon: "📦", border: "border-gray-700", glow: "" };
          const cdEntry = cooldowns.find((c) => c.itemKey === item.itemKey);
          const cdMs = cdEntry ? Math.max(0, new Date(cdEntry.expiresAt).getTime() - now) : 0;
          const onCooldown = cdMs > 0;
          const consumeSecs = consuming[item.itemKey] ?? 0;
          const isConsuming = consumeSecs > 0;
          const isReviveOnly = item.itemKey === "revive_potion" && !character.isDead;
          const isDisabled = onCooldown || isConsuming || using === item.itemKey || isReviveOnly;

          return (
            <div
              key={item.itemKey}
              className="relative"
              onMouseEnter={() => setHovered(item.itemKey)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Item slot */}
              <button
                onClick={() => !isDisabled && useItem(item)}
                disabled={isDisabled}
                className={`
                  relative w-16 h-16 border-2 ${meta.border}
                  flex flex-col items-center justify-center gap-0.5
                  bg-gray-900 transition-all duration-150
                  ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800 hover:shadow-lg hover:shadow-${meta.glow} cursor-pointer"}
                `}
                title={item.name}
              >
                <span className="text-2xl leading-none">{meta.icon}</span>
                {meta.level && (
                  <span className="text-[9px] font-mono font-bold text-red-400 leading-none">{meta.level}</span>
                )}

                {/* Cooldown overlay */}
                {onCooldown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <span className="text-[10px] font-mono text-orange-400 font-bold">{formatMs(cdMs)}</span>
                  </div>
                )}

                {/* Consuming overlay */}
                {isConsuming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <span className="text-[8px] font-mono text-yellow-400">eating</span>
                    <span className="text-[10px] font-mono text-yellow-300 font-bold">{formatMs(consumeSecs * 1000)}</span>
                  </div>
                )}

                {/* Quantity badge */}
                <span className="absolute -bottom-1.5 -right-1.5 bg-gray-800 border border-gray-600 text-[9px] font-mono text-gray-300 px-1 leading-tight">
                  x{item.quantity}
                </span>
              </button>

              {/* Hover tooltip */}
              {hovered === item.itemKey && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-gray-950 border border-gray-700 p-2 shadow-xl pointer-events-none">
                  <div className={`text-xs font-mono font-bold ${RARITY_COLORS[item.rarity] ?? "text-gray-300"} mb-1`}>
                    {item.name}
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 leading-relaxed mb-1.5">
                    {item.description}
                  </div>
                  {item.effect && (
                    <div className="text-[10px] font-mono text-cyan-400 mb-1">
                      Effect: {formatEffect(item.effect, item.effectValue)}
                    </div>
                  )}
                  {item.consumeTimeMinutes > 0 && (
                    <div className="text-[10px] font-mono text-yellow-600">
                      Consume time: {item.consumeTimeMinutes}m
                    </div>
                  )}
                  {item.cooldownMinutes > 0 && (
                    <div className={`text-[10px] font-mono ${onCooldown ? "text-orange-400" : "text-gray-600"}`}>
                      {onCooldown ? `Cooldown: ${formatMs(cdMs)}` : `Cooldown: ${item.cooldownMinutes}m`}
                    </div>
                  )}
                  {item.itemKey === "black_potion" && (
                    <div className="text-[10px] font-mono text-gray-600 mt-1 space-y-0.5">
                      <div className="text-gray-500 font-bold">Possible outcomes:</div>
                      <div>13% — Poisoned (−15 HP/sec, 4h)</div>
                      <div>19% — Sudden death</div>
                      <div>38% — −50% current HP</div>
                      <div>30% — Double current HP</div>
                    </div>
                  )}
                  {isReviveOnly && (
                    <div className="text-[10px] font-mono text-gray-600 mt-1">Only usable when dead</div>
                  )}
                  {!isDisabled && item.itemKey !== "black_potion" && (
                    <div className="text-[10px] font-mono text-green-600 mt-1">Click to use</div>
                  )}
                  {!isDisabled && item.itemKey === "black_potion" && (
                    <div className="text-[10px] font-mono text-yellow-700 mt-1">Click to drink (if you dare)</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
