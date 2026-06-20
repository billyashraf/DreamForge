import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Item from "@/models/Item";
import Character from "@/models/Character";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.itemKey) return err("itemKey is required");

  const quantity = Math.min(Math.max(1, Math.floor(Number(body.quantity ?? 1))), 99);

  await connectDB();

  const item = await Item.findOne({ itemKey: body.itemKey, isAvailable: true });
  if (!item) return err("Item not available");

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  const totalCost = item.price * quantity;
  if (character.credits < totalCost) {
    return err(`Not enough credits — need ${totalCost}¢, have ${character.credits}¢.`);
  }

  character.credits -= totalCost;

  const invIdx = character.inventory.findIndex(
    (slot) => slot.itemId.toString() === (item._id as { toString(): string }).toString()
  );
  if (invIdx >= 0) {
    character.inventory[invIdx].quantity += quantity;
  } else {
    character.inventory.push({ itemId: item._id as never, quantity });
  }

  await character.save();

  return ok({
    message: `Bought ${quantity}x ${item.name} for ${totalCost}¢.`,
    credits:  character.credits,
    itemKey:  item.itemKey,
    quantity,
  });
}
