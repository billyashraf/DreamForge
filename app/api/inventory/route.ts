import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import { IItem } from "@/models/Item";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character
    .findOne({ userId: session.userId })
    .select("inventory itemCooldowns")
    .populate<{ inventory: { itemId: IItem; quantity: number }[] }>("inventory.itemId");

  if (!character) return err("Character not found", 404);

  const inventory = character.inventory
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

  return ok({ inventory, itemCooldowns: character.itemCooldowns ?? [] });
}
