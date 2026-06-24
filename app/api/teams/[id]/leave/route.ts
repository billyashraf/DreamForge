import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    await connectDB();

    const [team, character] = await Promise.all([
      Team.findById(id),
      Character.findOne({ userId: session.userId }).select("_id teamId teamIds"),
    ]);

    if (!team) return err("Team not found", 404);
    if (!character) return err("Character not found", 404);

    if (team.leaderId.toString() === character._id.toString())
      return err("Leaders cannot leave — disband the team instead", 403);

    const charIdStr = character._id.toString();
    const isMember = team.members.some((m) => m.toString() === charIdStr);
    if (!isMember) return err("You are not in this team");

    team.members = team.members.filter((m) => m.toString() !== charIdStr) as never;
    character.teamIds = (character.teamIds ?? []).filter((t) => t.toString() !== id) as never;
    if (character.teamId?.toString() === id)
      character.teamId = (character.teamIds[0] ?? undefined) as never;

    await Promise.all([team.save(), character.save()]);
    return ok({ message: `You left team "${team.name}"` });
  } catch (e) {
    console.error("[team leave]", e);
    return err("Server error", 500);
  }
}
