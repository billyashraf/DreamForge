import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import Item from "@/models/Item";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const [items, character] = await Promise.all([
    Item.find({ itemKey: { $ne: "" }, type: "consumable", isAvailable: true })
      .select("itemKey name description effect effectValue cooldownMinutes consumeTimeMinutes rarity price")
      .sort({ price: 1 }),
    Character.findOne({ userId: session.userId }).select("credits"),
  ]);

  return ok({
    credits: character?.credits ?? 0,
    items: items.map((i) => ({
      itemKey:            i.itemKey,
      name:               i.name,
      description:        i.description,
      effect:             i.effect,
      effectValue:        i.effectValue,
      cooldownMinutes:    i.cooldownMinutes,
      consumeTimeMinutes: i.consumeTimeMinutes,
      rarity:             i.rarity,
      price:              i.price,
    })),
  });
}
