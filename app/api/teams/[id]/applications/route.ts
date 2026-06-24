import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

async function resolveLeader(teamId: string, userId: string) {
  const [team, character] = await Promise.all([
    Team.findById(teamId),
    Character.findOne({ userId }).select("_id"),
  ]);
  if (!team || !character) return { team: null, character: null, authorized: false };
  const authorized = team.leaderId.toString() === character._id.toString();
  return { team, character, authorized };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  await connectDB();

  const { team, authorized } = await resolveLeader(id, session.userId);
  if (!team) return err("Team not found", 404);
  if (!authorized) return forbidden();

  const appCharIds = (team.applications ?? []).map((a) => a.characterId);
  const chars = await Character.find({ _id: { $in: appCharIds } })
    .select("name level shadowForm")
    .lean();

  const charMap = new Map(chars.map((c) => [c._id.toString(), c]));
  const applications = (team.applications ?? []).map((a) => {
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

  const { team, authorized } = await resolveLeader(id, session.userId);
  if (!team) return err("Team not found", 404);
  if (!authorized) return forbidden();

  if (!team.applications) team.applications = [];

  const appIndex = (team.applications ?? []).findIndex(
    (a) => a.characterId.toString() === characterId
  );
  if (appIndex === -1) return err("Application not found");

  team.applications.splice(appIndex, 1);

  if (action === "accept") {
    const applicant = await Character.findById(characterId);
    if (!applicant) return err("Applicant not found", 404);

    const alreadyMember = team.members.some((m) => m.toString() === characterId);
    if (!alreadyMember) {
      if ((applicant.teamIds ?? []).length >= 19)
        return err("This player has reached the maximum of 19 team memberships");
      if (team.members.length >= team.maxSize)
        return err("Team is already full");

      team.members.push(applicant._id as never);
      applicant.teamIds = [...(applicant.teamIds ?? []), team._id as never];
      if (!applicant.teamId) applicant.teamId = team._id as never;
      await applicant.save();
    }
  }

  await team.save();
  return ok({
    message: action === "accept"
      ? "Application accepted — player joined the team"
      : "Application rejected",
  });
}
