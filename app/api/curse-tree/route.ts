import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Character from "@/models/Character";
import { ok, err, unauthorized } from "@/lib/response";

const ACTIVATE_COST = 50;

function upgradeCost(currentLevel: number): number {
  return 50 * Math.pow(2, currentLevel); // L1→L2: 100, L2→L3: 200, L3→L4: 400
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select(
    "merits curseTree"
  );
  if (!character) return err("Character not found", 404);

  return ok({
    merits: character.merits ?? 1000,
    curseTree: character.curseTree ?? [],
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const body = await req.json().catch(() => null);
  if (!body?.action || !body?.skillId) {
    return err("Missing action or skillId");
  }
  const { action, skillId } = body as { action: string; skillId: string };

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  const merits = character.merits ?? 1000;

  if (action === "activate") {
    const already = character.curseTree?.find((n) => n.skillId === skillId);
    if (already) return err("Skill already activated");

    if (merits < ACTIVATE_COST) return err("Not enough merits");

    character.merits = merits - ACTIVATE_COST;
    character.curseTree = [...(character.curseTree ?? []), { skillId, level: 1 }];
    await character.save();

    return ok({ merits: character.merits, curseTree: character.curseTree });
  }

  if (action === "upgrade") {
    const node = character.curseTree?.find((n) => n.skillId === skillId);
    if (!node) return err("Skill not yet activated");

    const cost = upgradeCost(node.level);
    if (merits < cost) return err("Not enough merits");

    character.merits = merits - cost;
    node.level += 1;
    character.markModified("curseTree");
    await character.save();

    return ok({ merits: character.merits, curseTree: character.curseTree, newLevel: node.level });
  }

  return err("Unknown action");
}
