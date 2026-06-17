import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Character from "@/models/Character";
import { ok, err, unauthorized } from "@/lib/response";

const ACTIVATE_COST = 50;
const upgradeCost = (level: number) => 50 * Math.pow(2, level);
const linkUpgradeCost = (weight: number) => 75 * Math.pow(2, weight - 1);

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();
  const character = await Character.findOne({ userId: session.userId }).select(
    "merits curseTree curseLinks"
  );
  if (!character) return err("Character not found", 404);

  return ok({
    merits: character.merits ?? 1000,
    curseTree: character.curseTree ?? [],
    curseLinks: character.curseLinks ?? [],
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const body = await req.json().catch(() => null);
  if (!body?.action) return err("Missing action");

  const { action } = body as { action: string };
  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  const merits = character.merits ?? 1000;

  // ── Skill actions ─────────────────────────────────────────────────────────
  if (action === "activate") {
    const { skillId } = body as { skillId: string };
    if (!skillId) return err("Missing skillId");
    if (character.curseTree?.find((n) => n.skillId === skillId)) return err("Already activated");
    if (merits < ACTIVATE_COST) return err("Not enough merits");

    character.merits = merits - ACTIVATE_COST;
    character.curseTree = [...(character.curseTree ?? []), { skillId, level: 1 }];
    await character.save();
    return ok({ merits: character.merits, curseTree: character.curseTree });
  }

  if (action === "upgrade") {
    const { skillId } = body as { skillId: string };
    if (!skillId) return err("Missing skillId");
    const node = character.curseTree?.find((n) => n.skillId === skillId);
    if (!node) return err("Skill not activated");

    const cost = upgradeCost(node.level);
    if (merits < cost) return err("Not enough merits");

    character.merits = merits - cost;
    node.level += 1;
    character.markModified("curseTree");
    await character.save();
    return ok({ merits: character.merits, newLevel: node.level });
  }

  // ── Link actions ──────────────────────────────────────────────────────────
  if (action === "addLink") {
    const { from, to } = body as { from: string; to: string };
    if (!from || !to) return err("Missing from/to");
    if (from === to) return err("Cannot link a skill to itself");

    const exists = character.curseLinks?.some(
      (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
    );
    if (exists) return err("Link already exists");

    character.curseLinks = [...(character.curseLinks ?? []), { from, to, weight: 1 }];
    await character.save();
    return ok({ merits: character.merits, curseLinks: character.curseLinks });
  }

  if (action === "upgradeLink") {
    const { from, to } = body as { from: string; to: string };
    if (!from || !to) return err("Missing from/to");

    const link = character.curseLinks?.find(
      (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
    );
    if (!link) return err("Link not found");

    const cost = linkUpgradeCost(link.weight);
    if (merits < cost) return err("Not enough merits");

    character.merits = merits - cost;
    link.weight += 1;
    character.markModified("curseLinks");
    await character.save();
    return ok({ merits: character.merits, newWeight: link.weight });
  }

  if (action === "removeLink") {
    const { from, to } = body as { from: string; to: string };
    if (!from || !to) return err("Missing from/to");

    character.curseLinks = (character.curseLinks ?? []).filter(
      (l) => !((l.from === from && l.to === to) || (l.from === to && l.to === from))
    );
    character.markModified("curseLinks");
    await character.save();
    return ok({ merits: character.merits, curseLinks: character.curseLinks });
  }

  return err("Unknown action");
}
