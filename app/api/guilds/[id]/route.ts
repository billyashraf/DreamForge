import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  await connectDB();

  const guild = await Guild.findById(id).lean();
  if (!guild) return err("Guild not found", 404);

  const viewer = await Character.findOne({ userId: session.userId }).select("_id guildIds").lean();

  const memberIds = guild.members.map((m) => m.toString());
  const memberDocs = await Character.find({ _id: { $in: memberIds } })
    .select("name level shadowForm")
    .lean();

  const rankMap = new Map(
    (guild.memberRanks ?? []).map((r) => [r.memberId.toString(), r.rank as string])
  );
  const positionMap = new Map(
    (guild.memberPositions ?? []).map((p) => [p.memberId.toString(), p.position as string])
  );
  const leaderIdStr = guild.leaderId.toString();

  const members = memberDocs.map((m) => {
    const idStr = m._id.toString();
    const rank = idStr === leaderIdStr ? "king" : (rankMap.get(idStr) ?? "pawn");
    const position = positionMap.get(idStr) ?? null;
    return { _id: idStr, name: m.name, level: m.level, shadowForm: m.shadowForm, rank, position };
  });

  members.sort((a, b) => {
    const order = ["king", "queen", "rook", "bishop", "knight", "pawn"];
    return order.indexOf(a.rank) - order.indexOf(b.rank);
  });

  const viewerCharId = viewer?._id.toString() ?? "";
  const isMember = memberIds.includes(viewerCharId);
  const isLeader = leaderIdStr === viewerCharId;
  const viewerRank = isLeader
    ? "king"
    : (rankMap.get(viewerCharId) ?? (isMember ? "pawn" : null));

  const hasApplied = (guild.applications ?? []).some(
    (a) => a.characterId.toString() === viewerCharId
  );


  return ok({
    guild: {
      _id: guild._id.toString(),
      name: guild.name,
      tag: guild.tag,
      description: guild.description,
      marsRating: guild.marsRating,
      level: guild.level,
      leaderId: leaderIdStr,
    },
    members,
    isMember,
    isLeader,
    viewerRank,
    viewerCharId,
    hasApplied,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    await connectDB();

    const [guild, character] = await Promise.all([
      Guild.findById(id),
      Character.findOne({ userId: session.userId }).select("_id"),
    ]);

    if (!guild) return err("Guild not found", 404);
    if (!character) return err("Character not found", 404);
    if (guild.leaderId.toString() !== character._id.toString()) return forbidden();

    const memberIds = guild.members.map((m) => m.toString());

    await Character.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { guildIds: guild._id } }
    );
    await Character.updateMany(
      { _id: { $in: memberIds }, guildId: guild._id },
      { $unset: { guildId: "" } }
    );

    await Guild.findByIdAndDelete(id);

    return ok({ message: `Guild [${guild.tag}] ${guild.name} has been disbanded` });
  } catch (e) {
    console.error("[delete guild]", e);
    return err("Server error", 500);
  }
}
