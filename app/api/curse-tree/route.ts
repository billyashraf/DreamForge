import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Character from "@/models/Character";
import { ok, err, unauthorized } from "@/lib/response";
import { SKILL_NAMES, SKILL_STATS, MAX_CURSE_LEVEL } from "@/lib/curseSkills";

const ACTIVATE_COST   = 50;
const upgradeCost     = (level:  number) => 50  * Math.pow(2, level);
const linkUpgradeCost = (weight: number) => 75  * Math.pow(2, weight - 1);

function statOf(skillId: string) {
  const idx = SKILL_NAMES.indexOf(skillId);
  return idx >= 0 ? SKILL_STATS[idx] : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const character = await Character.findOne({ userId: session.userId }).select(
    "merits curseTree curseLinks"
  );
  if (!character) return err("Character not found", 404);
  return ok({
    merits:     character.merits     ?? 1000,
    curseTree:  character.curseTree  ?? [],
    curseLinks: character.curseLinks ?? [],
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body?.action) return err("Missing action");
    const { action } = body as { action: string };

    const char = await Character.findOne({ userId: session.userId });
    if (!char) return err("Character not found", 404);

    const merits = char.merits ?? 1000;

    // ── activate ────────────────────────────────────────────────────────────
    if (action === "activate") {
      const { skillId } = body as { skillId: string };
      if (!skillId) return err("Missing skillId");
      if ((char.curseTree ?? []).some((n: { skillId: string }) => n.skillId === skillId))
        return err("Already activated");
      if (merits < ACTIVATE_COST) return err("Not enough merits");

      const newTree = [
        ...(char.curseTree ?? []).map((n: { skillId: string; level: number }) => ({
          skillId: n.skillId, level: n.level,
        })),
        { skillId, level: 1 },
      ];

      const stat    = statOf(skillId);
      const setPayload: Record<string, unknown> = {
        curseTree: newTree,
        merits: merits - ACTIVATE_COST,
      };
      if (stat) setPayload[stat] = (char[stat] ?? 5) + 1; // level 1 → +1 stat

      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: setPayload },
        { new: true }
      );
      console.log(`[activate] ${skillId} → +1 ${stat ?? "?"}, merits=${updated?.merits}`);
      return ok({
        merits:   updated?.merits ?? merits - ACTIVATE_COST,
        curseTree: updated?.curseTree ?? newTree,
        stat,
        statValue: stat ? updated?.[stat] : null,
      });
    }

    // ── upgrade ─────────────────────────────────────────────────────────────
    if (action === "upgrade") {
      const { skillId } = body as { skillId: string };
      if (!skillId) return err("Missing skillId");

      const node = (char.curseTree ?? []).find((n: { skillId: string }) => n.skillId === skillId);
      if (!node) return err("Skill not activated");
      if (node.level >= MAX_CURSE_LEVEL)
        return err(`Already at max level (${MAX_CURSE_LEVEL})`);

      const cost = upgradeCost(node.level);
      if (merits < cost) return err("Not enough merits");

      const newTree = (char.curseTree ?? []).map((n: { skillId: string; level: number }) =>
        n.skillId === skillId
          ? { skillId: n.skillId, level: n.level + 1 }
          : { skillId: n.skillId, level: n.level }
      );

      const stat    = statOf(skillId);
      const setPayload: Record<string, unknown> = {
        curseTree: newTree,
        merits: merits - cost,
      };
      if (stat) setPayload[stat] = (char[stat] ?? 5) + 1; // each upgrade → +1 stat

      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: setPayload },
        { new: true }
      );
      const newNode = (updated?.curseTree ?? []).find((n: { skillId: string }) => n.skillId === skillId);
      return ok({
        merits:   updated?.merits ?? merits - cost,
        newLevel: newNode?.level  ?? node.level + 1,
        stat,
        statValue: stat ? updated?.[stat] : null,
      });
    }

    // ── addLink ─────────────────────────────────────────────────────────────
    if (action === "addLink") {
      const { from, to } = body as { from: string; to: string };
      if (!from || !to) return err("Missing from/to");
      if (from === to) return err("Cannot link a skill to itself");
      const exists = (char.curseLinks ?? []).some(
        (l: { from: string; to: string }) =>
          (l.from === from && l.to === to) || (l.from === to && l.to === from)
      );
      if (exists) return err("Link already exists");

      const newLinks = [
        ...(char.curseLinks ?? []).map((l: { from: string; to: string; weight: number }) => ({
          from: l.from, to: l.to, weight: l.weight,
        })),
        { from, to, weight: 1 },
      ];
      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: { curseLinks: newLinks } },
        { new: true }
      );
      return ok({ merits: updated?.merits ?? merits, curseLinks: updated?.curseLinks ?? newLinks });
    }

    // ── upgradeLink ─────────────────────────────────────────────────────────
    if (action === "upgradeLink") {
      const { from, to } = body as { from: string; to: string };
      if (!from || !to) return err("Missing from/to");

      const link = (char.curseLinks ?? []).find(
        (l: { from: string; to: string }) =>
          (l.from === from && l.to === to) || (l.from === to && l.to === from)
      );
      if (!link) return err("Link not found");
      const cost = linkUpgradeCost(link.weight);
      if (merits < cost) return err("Not enough merits");

      const newLinks = (char.curseLinks ?? []).map((l: { from: string; to: string; weight: number }) => {
        const match = (l.from === from && l.to === to) || (l.from === to && l.to === from);
        return { from: l.from, to: l.to, weight: match ? l.weight + 1 : l.weight };
      });
      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: { curseLinks: newLinks, merits: merits - cost } },
        { new: true }
      );
      const updatedLink = (updated?.curseLinks ?? []).find(
        (l: { from: string; to: string }) =>
          (l.from === from && l.to === to) || (l.from === to && l.to === from)
      );
      return ok({ merits: updated?.merits ?? merits - cost, newWeight: updatedLink?.weight ?? link.weight + 1 });
    }

    // ── removeLink ──────────────────────────────────────────────────────────
    if (action === "removeLink") {
      const { from, to } = body as { from: string; to: string };
      if (!from || !to) return err("Missing from/to");

      const newLinks = (char.curseLinks ?? [])
        .filter(
          (l: { from: string; to: string }) =>
            !((l.from === from && l.to === to) || (l.from === to && l.to === from))
        )
        .map((l: { from: string; to: string; weight: number }) => ({
          from: l.from, to: l.to, weight: l.weight,
        }));
      const updated = await Character.findOneAndUpdate(
        { _id: char._id },
        { $set: { curseLinks: newLinks } },
        { new: true }
      );
      return ok({ merits: updated?.merits ?? merits, curseLinks: updated?.curseLinks ?? newLinks });
    }

    return err("Unknown action");
  } catch (e) {
    console.error("[curse-tree POST]", e);
    return err("Internal server error", 500);
  }
}
