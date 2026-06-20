import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Item, { IItem } from "@/models/Item";

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

  // Apply effect
  switch (item.effect) {
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

  // Decrement / remove from inventory
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

  await character.save();

  // Populate for response
  await character.populate<{ inventory: { itemId: IItem; quantity: number }[] }>("inventory.itemId");

  const inventoryOut = (character.inventory as unknown as { itemId: IItem; quantity: number }[])
    .filter((slot) => slot.itemId && slot.quantity > 0)
    .map((slot) => ({
      itemKey: slot.itemId.itemKey,
      name: slot.itemId.name,
      quantity: slot.quantity,
      effect: slot.itemId.effect,
      effectValue: slot.itemId.effectValue,
      cooldownMinutes: slot.itemId.cooldownMinutes,
      consumeTimeMinutes: slot.itemId.consumeTimeMinutes,
      description: slot.itemId.description,
      rarity: slot.itemId.rarity,
    }));

  return ok({
    message: `Used ${item.name}`,
    effect: item.effect,
    effectValue: item.effectValue,
    consumeTimeMinutes: item.consumeTimeMinutes,
    character: {
      health: character.health,
      maxHealth: character.maxHealth,
      energy: character.energy,
      maxEnergy: character.maxEnergy,
      pain: character.pain,
      maxPain: character.maxPain,
    },
    inventory: inventoryOut,
    itemCooldowns: character.itemCooldowns ?? [],
  });
}
