import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import { transferGuildLeadershipIfInactive } from "@/lib/transferGuildLeadership";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  await connectDB();

  // Transfer leadership if leader has been inactive for 2+ days
  await transferGuildLeadershipIfInactive(id);

  const guild = await Guild.findById(id).lean();
  if (!guild) return err("Guild not found", 404);

  const viewer = await Character.findOne({ userId: session.userId }).select("_id guildIds").lean();

  const memberIds = guild.members.map((m) => m.toString());
  const memberDocs = await Character.find({ _id: { $in: memberIds } })
    .select("name level shadowForm")
    .lean();

  const positionMap = new Map(
    (guild.memberPositions ?? []).map((p) => [p.memberId.toString(), (p.positions ?? []) as string[]])
  );
  const leaderIdStr = guild.leaderId.toString();

  const members = memberDocs.map((m) => {
    const idStr = m._id.toString();
    const positions = idStr === leaderIdStr ? [] : (positionMap.get(idStr) ?? []);
    return { _id: idStr, name: m.name, level: m.level, shadowForm: m.shadowForm, positions };
  });

  // Sort: leader first, then queen holders, then by level
  const RANK_ORDER = ["queen","rook","bishop","knight","pawn","saber","lancer","rider","caster","berserker","archer","assassin","demon"];
  members.sort((a, b) => {
    if (a._id === leaderIdStr) return -1;
    if (b._id === leaderIdStr) return 1;
    const aTop = a.positions.length ? RANK_ORDER.indexOf(a.positions[0]) : 99;
    const bTop = b.positions.length ? RANK_ORDER.indexOf(b.positions[0]) : 99;
    if (aTop !== bTop) return aTop - bTop;
    return b.level - a.level;
  });

  const viewerCharId = viewer?._id.toString() ?? "";
  const isMember = memberIds.includes(viewerCharId);
  const isLeader = leaderIdStr === viewerCharId;
  const viewerPositions = positionMap.get(viewerCharId) ?? [];

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
    viewerCharId,
    viewerPositions,
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
