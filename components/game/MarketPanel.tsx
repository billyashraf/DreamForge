"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface MarketItem {
  itemKey: string;
  name: string;
  description: string;
  effect: string | null;
  effectValue: number;
  cooldownMinutes: number;
  consumeTimeMinutes: number;
  rarity: string;
  price: number;
}

const ITEM_ICONS: Record<string, string> = {
  sedative:      "💊",
  meat:          "🥩",
  red_potion_1:  "🧪",
  red_potion_2:  "🧪",
  red_potion_3:  "🧪",
  revive_potion: "🤍",
  black_potion:  "🖤",
};

const RARITY_COLORS: Record<string, string> = {
  common:    "text-gray-400",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  epic:      "text-purple-400",
  legendary: "text-yellow-400",
};

function effectLabel(effect: string | null, value: number, consumeMin: number, cdMin: number): string {
  const parts: string[] = [];
  if (effect === "pain_reduce") parts.push(`−${value} Pain`);
  else if (effect === "energy_add") parts.push(`+${value} EN`);
  else if (effect === "health_add") parts.push(`+${value} HP`);
  else if (effect === "revive") parts.push("Revive from death");
  else parts.push("Random effect");
  if (consumeMin > 0) parts.push(`${consumeMin}m to consume`);
  if (cdMin > 0) parts.push(`${cdMin}m cooldown`);
  return parts.join(" · ");
}

export function MarketPanel() {
  const { character, updateCharacter, addLog } = useGameStore();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/market");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.data.items ?? []);
      setCredits(data.data.credits ?? 0);
    }
    load();
  }, []);

  // Keep local credit display in sync with store
  useEffect(() => {
    if (character?.credits !== undefined) setCredits(character.credits);
  }, [character?.credits]);

  async function buy(item: MarketItem) {
    if (buying) return;
    setBuying(item.itemKey);
    try {
      const res = await fetch("/api/market/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.itemKey, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(data.error ?? "Purchase failed.", "error");
        return;
      }
      const d = data.data;
      setCredits(d.credits);
      updateCharacter({ credits: d.credits });
      addLog(`Bought ${item.name} for ${item.price}¢ — ${character?.credits ?? 0} → ${d.credits}¢`, "success");
    } catch {
      addLog("Purchase failed. Connection error.", "error");
    } finally {
      setBuying(null);
    }
  }

  if (!character) return null;

  return (
    <Card title="Market" accent="purple">
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-gray-600">Available credits</span>
          <span className="text-cyan-400 font-bold">{credits}¢</span>
        </div>

        {items.length === 0 ? (
          <p className="text-xs font-mono text-gray-600">No items available.</p>
        ) : (
          items.map((item) => {
            const canAfford = credits >= item.price;
            const isBuying = buying === item.itemKey;
            return (
              <div
                key={item.itemKey}
                className="flex items-center gap-3 p-2 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <span className="text-xl w-7 text-center shrink-0">
                  {ITEM_ICONS[item.itemKey] ?? "📦"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-mono font-bold ${RARITY_COLORS[item.rarity] ?? "text-gray-300"}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 leading-relaxed">
                    {effectLabel(item.effect, item.effectValue, item.consumeTimeMinutes, item.cooldownMinutes)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-mono font-bold ${canAfford ? "text-yellow-500" : "text-red-800"}`}>
                    {item.price}¢
                  </span>
                  <Button
                    size="sm"
                    variant={canAfford ? "secondary" : "ghost"}
                    loading={isBuying}
                    disabled={!canAfford || !!buying}
                    onClick={() => buy(item)}
                  >
                    {canAfford ? "Buy" : "—"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
