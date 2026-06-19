import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Character from "@/models/Character";
import { ok, err, unauthorized } from "@/lib/response";
import {
  ACADEMY_FIELDS,
  MAX_ACADEMY_LEVEL,
  UNLOCK_COST,
  upgradeCost,
} from "@/lib/academyFields";

function fieldById(id: string) {
  return ACADEMY_FIELDS.find(f => f.id === id) ?? null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const character = await Character.findOne({ userId: session.userId }).select(
    "merits academyTree"
  );
  if (!character) return err("Character not found", 404);
  return ok({
    merits:      character.merits      ?? 1000,
    academyTree: character.academyTree ?? [],
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body?.action) return err("Missing action");
    const { action, fieldId } = body as { action: string; fieldId: string };
    if (!fieldId) return err("Missing fieldId");

    const field = fieldById(fieldId);
    if (!field) return err("Unknown field");

    const char = await Character.findOne({ userId: session.userId });
    if (!char) return err("Character not found", 404);

    const merits: number = char.merits ?? 1000;
    const tree: { fieldId: string; level: number }[] = char.academyTree ?? [];

    // ── unlock ───────────────────────────────────────────────────────────────
    if (action === "unlock") {
      if (tree.some(n => n.fieldId === fieldId)) return err("Already unlocked");
      if (merits < UNLOCK_COST) return err("Not enough merits");

      // Parent must be unlocked (root has no parent)
      if (field.parent !== null) {
        const parentUnlocked = tree.some(n => n.fieldId === field.parent);
        if (!parentUnlocked) return err("Parent field must be unlocked first");
      }

      const newTree = [...tree.map(n => ({ fieldId: n.fieldId, level: n.level })), { fieldId, level: 1 }];
      const setPayload: Record<string, unknown> = {
        academyTree: newTree,
        merits: merits - UNLOCK_COST,
      };
      setPayload[field.stat] = (char[field.stat as keyof typeof char] as number ?? 5) + 1;

      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: setPayload },
        { new: true }
      );
      return ok({
        merits:      updated?.merits ?? merits - UNLOCK_COST,
        academyTree: updated?.academyTree ?? newTree,
        stat:        field.stat,
      });
    }

    // ── upgrade ──────────────────────────────────────────────────────────────
    if (action === "upgrade") {
      const node = tree.find(n => n.fieldId === fieldId);
      if (!node) return err("Field not unlocked");
      if (node.level >= MAX_ACADEMY_LEVEL) return err(`Already at max level (${MAX_ACADEMY_LEVEL})`);

      const cost = upgradeCost(node.level);
      if (merits < cost) return err("Not enough merits");

      const newTree = tree.map(n =>
        n.fieldId === fieldId
          ? { fieldId: n.fieldId, level: n.level + 1 }
          : { fieldId: n.fieldId, level: n.level }
      );
      const setPayload: Record<string, unknown> = {
        academyTree: newTree,
        merits: merits - cost,
      };
      setPayload[field.stat] = (char[field.stat as keyof typeof char] as number ?? 5) + 1;

      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: setPayload },
        { new: true }
      );
      const updatedNode = (updated?.academyTree ?? []).find(
        (n: { fieldId: string }) => n.fieldId === fieldId
      );
      return ok({
        merits:   updated?.merits ?? merits - cost,
        newLevel: updatedNode?.level ?? node.level + 1,
        stat:     field.stat,
      });
    }

    return err("Unknown action");
  } catch (e) {
    console.error("[academy POST]", e);
    return err("Internal server error", 500);
  }
}
