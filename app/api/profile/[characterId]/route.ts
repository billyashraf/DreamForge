import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { characterId } = await params;

  await connectDB();

  const target = await Character.findById(characterId)
    .select("name level shadowForm currentLocation strength intelligence agility guildIds teamIds isDead merits")
    .lean();

  if (!target) return err("Character not found", 404);

  const viewer = await Character.findOne({ userId: session.userId })
    .select("_id name owlReturnAt");

  const [guilds, teams] = await Promise.all([
    target.guildIds?.length
      ? Guild.find({ _id: { $in: target.guildIds } }).select("name tag leaderId memberPositions").lean()
      : Promise.resolve([]),
    target.teamIds?.length
      ? Team.find({ _id: { $in: target.teamIds } }).select("_id name").lean()
      : Promise.resolve([]),
  ]);

  const isOwn = viewer?._id.toString() === characterId;
  const owlAvailable = !viewer?.owlReturnAt || viewer.owlReturnAt <= new Date();

  return ok({
    character: { ...target, _id: target._id.toString() },
    guilds: guilds.map((g) => {
      const isLeader = g.leaderId.toString() === characterId;
      const positions: string[] = isLeader
        ? ["king"]
        : (g.memberPositions ?? []).find((p) => p.memberId.toString() === characterId)?.positions ?? [];
      return { _id: g._id.toString(), name: g.name, tag: g.tag, positions };
    }),
    teams: teams.map((t) => ({ _id: t._id.toString(), name: (t as { name: string }).name })),
    isOwn,
    viewerOwlAvailable: owlAvailable,
    viewerOwlReturnAt: viewer?.owlReturnAt ?? null,
    viewerCharacterId: viewer?._id.toString() ?? null,
    viewerName: viewer?.name ?? null,
  });
}
