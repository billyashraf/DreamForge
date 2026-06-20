import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Item, { IItem } from "@/models/Item";

function charSnapshot(character: InstanceType<typeof Character>) {
  return {
    health:          character.health,
    maxHealth:       character.maxHealth,
    energy:          character.energy,
    maxEnergy:       character.maxEnergy,
    pain:            character.pain,
    maxPain:         character.maxPain,
    isDead:          character.isDead,
    poisonedUntil:   character.poisonedUntil,
    lastPoisonTick:  character.lastPoisonTick,
  };
}

async function buildInventoryResponse(character: InstanceType<typeof Character>) {
  await character.populate<{ inventory: { itemId: IItem; quantity: number }[] }>("inventory.itemId");
  return (character.inventory as unknown as { itemId: IItem; quantity: number }[])
    .filter((slot) => slot.itemId && slot.quantity > 0)
    .map((slot) => ({
      itemKey:           slot.itemId.itemKey,
      name:              slot.itemId.name,
      quantity:          slot.quantity,
      effect:            slot.itemId.effect,
      effectValue:       slot.itemId.effectValue,
      cooldownMinutes:   slot.itemId.cooldownMinutes,
      consumeTimeMinutes: slot.itemId.consumeTimeMinutes,
      description:       slot.itemId.description,
      rarity:            slot.itemId.rarity,
    }));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.itemKey) return err("itemKey is required");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  const item = await Item.findOne({ itemKey: body.itemKey });
  if (!item) return err("Item not found", 404);

  // Revive potion: only usable when dead
  if (item.effect === "revive" && !character.isDead) {
    return err("You are not dead. Save it for when you need it.");
  }
  // All other items: blocked while dead
  if (character.isDead && item.effect !== "revive") {
    return err("You cannot use items while dead. Respawn first.");
  }

  // Check inventory
  const invIdx = character.inventory.findIndex(
    (slot) => slot.itemId.toString() === (item._id as { toString(): string }).toString()
  );
  if (invIdx === -1 || character.inventory[invIdx].quantity <= 0) {
    return err("Item not in inventory");
  }

  // Check cooldown
  if (item.cooldownMinutes > 0) {
    const cooldown = (character.itemCooldowns ?? []).find((c) => c.itemKey === item.itemKey);
    if (cooldown && cooldown.expiresAt > new Date()) {
      const msLeft = cooldown.expiresAt.getTime() - Date.now();
      const mins = Math.floor(msLeft / 60000);
      const secs = Math.floor((msLeft % 60000) / 1000);
      return err(`On cooldown: ${mins}m ${secs}s remaining`);
    }
  }

  // Decrement inventory
  character.inventory[invIdx].quantity -= 1;
  if (character.inventory[invIdx].quantity <= 0) {
    character.inventory.splice(invIdx, 1);
  }

  // Set cooldown
  if (item.cooldownMinutes > 0) {
    const expiresAt = new Date(Date.now() + item.cooldownMinutes * 60_000);
    const cdIdx = (character.itemCooldowns ?? []).findIndex((c) => c.itemKey === item.itemKey);
    if (cdIdx >= 0) {
      character.itemCooldowns[cdIdx].expiresAt = expiresAt;
    } else {
      character.itemCooldowns = [
        ...(character.itemCooldowns ?? []),
        { itemKey: item.itemKey, expiresAt },
      ];
    }
  }

  // ── Apply effect ──────────────────────────────────────────────────────────
  let message = `Used ${item.name}`;
  let outcomeKey: string | null = null;

  if (item.itemKey === "black_potion") {
    const roll = Math.random() * 100;
    if (roll < 13) {
      // 13% — poison for 4 hours (-15 HP/min)
      character.poisonedUntil = new Date(Date.now() + 4 * 60 * 60_000);
      character.lastPoisonTick = new Date();
      outcomeKey = "poisoned";
      message = "Black Potion: Poisoned! -15 HP/min for 4 hours.";
    } else if (roll < 32) {
      // 19% — sudden death
      character.health = 0;
      character.isDead = true;
      outcomeKey = "death";
      message = "Black Potion: Sudden death.";
    } else if (roll < 70) {
      // 38% — -50% current HP
      character.health = Math.max(1, Math.floor(character.health * 0.5));
      outcomeKey = "half_hp";
      message = `Black Potion: -50% HP. Now at ${character.health}/${character.maxHealth}.`;
    } else {
      // 30% — double current HP (capped at maxHealth)
      character.health = Math.min(character.health * 2, character.maxHealth);
      outcomeKey = "double_hp";
      message = `Black Potion: HP doubled! Now at ${character.health}/${character.maxHealth}.`;
    }
  } else {
    switch (item.effect) {
      case "revive":
        character.isDead = false;
        character.health = character.maxHealth;
        character.pain = 0;
        // Clear any active poison on revive
        character.poisonedUntil = undefined;
        character.lastPoisonTick = undefined;
        message = `${item.name}: Revived at full HP. Poison cleared.`;
        break;
      case "pain_reduce":
        character.pain = Math.max(0, (character.pain ?? 0) - item.effectValue);
        break;
      case "energy_add":
        character.energy = Math.min(character.energy + item.effectValue, character.maxEnergy);
        break;
      case "health_add":
        character.health = Math.min(character.health + item.effectValue, character.maxHealth);
        break;
    }
  }

  await character.save();

  const inventoryOut = await buildInventoryResponse(character);

  return ok({
    message,
    outcomeKey,
    effect:            item.effect,
    effectValue:       item.effectValue,
    consumeTimeMinutes: item.consumeTimeMinutes,
    character:         charSnapshot(character),
    inventory:         inventoryOut,
    itemCooldowns:     character.itemCooldowns ?? [],
  });
}
