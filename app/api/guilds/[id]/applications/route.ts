import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

async function resolveLeaderOrQueen(guildId: string, userId: string) {
  const [guild, character] = await Promise.all([
    Guild.findById(guildId),
    Character.findOne({ userId }).select("_id"),
  ]);
  if (!guild || !character) return { guild: null, character: null, authorized: false };

  if (!guild.applications) guild.applications = [];
  if (!guild.memberPositions) guild.memberPositions = [];

  const charIdStr = character._id.toString();
  const isLeader = guild.leaderId.toString() === charIdStr;
  const isQueen = guild.memberPositions.some(
    (p) => p.memberId.toString() === charIdStr && p.position === "queen"
  );
  return { guild, character, authorized: isLeader || isQueen };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  await connectDB();

  const { guild, authorized } = await resolveLeaderOrQueen(id, session.userId);
  if (!guild) return err("Guild not found", 404);
  if (!authorized) return forbidden();

  const appCharIds = guild.applications.map((a) => a.characterId);
  const chars = await Character.find({ _id: { $in: appCharIds } })
    .select("name level shadowForm")
    .lean();

  const charMap = new Map(chars.map((c) => [c._id.toString(), c]));

  const applications = guild.applications.map((a) => {
    const c = charMap.get(a.characterId.toString());
    return {
      characterId: a.characterId.toString(),
      name: c?.name ?? "Unknown",
      level: c?.level ?? 0,
      shadowForm: c?.shadowForm ?? null,
      message: a.message,
      appliedAt: a.appliedAt,
    };
  });

  return ok({ applications });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.characterId || !["accept", "reject"].includes(body.action))
    return err("characterId and action (accept|reject) required");

  const { characterId, action } = body;

  await connectDB();

  const { guild, authorized } = await resolveLeaderOrQueen(id, session.userId);
  if (!guild) return err("Guild not found", 404);
  if (!authorized) return forbidden();

  const appIndex = guild.applications.findIndex(
    (a) => a.characterId.toString() === characterId
  );
  if (appIndex === -1) return err("Application not found");

  guild.applications.splice(appIndex, 1);

  if (action === "accept") {
    const applicant = await Character.findById(characterId);
    if (!applicant) return err("Applicant character not found", 404);

    const alreadyMember = guild.members.some((m) => m.toString() === characterId);
    if (!alreadyMember) {
      if ((applicant.guildIds ?? []).length >= 49)
        return err("This player has reached the maximum of 49 guild memberships");

      guild.members.push(applicant._id as never);
      guild.memberRanks.push({ memberId: applicant._id as never, rank: "pawn" });
      applicant.guildIds = [...(applicant.guildIds ?? []), guild._id as never];
      if (!applicant.guildId) applicant.guildId = guild._id as never;
      await applicant.save();
    }
  }

  await guild.save();

  return ok({
    message: action === "accept"
      ? "Application accepted — player joined the guild"
      : "Application rejected",
  });
}
