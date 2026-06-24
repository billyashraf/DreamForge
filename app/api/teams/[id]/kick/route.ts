import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body?.memberId) return err("memberId required");

    const { memberId } = body;
    await connectDB();

    const [team, viewer] = await Promise.all([
      Team.findById(id),
      Character.findOne({ userId: session.userId }).select("_id"),
    ]);

    if (!team) return err("Team not found", 404);
    if (!viewer) return err("Character not found", 404);
    if (team.leaderId.toString() !== viewer._id.toString()) return forbidden();
    if (memberId === viewer._id.toString()) return err("Cannot kick yourself");

    const isMember = team.members.some((m) => m.toString() === memberId);
    if (!isMember) return err("That character is not in this team");

    team.members = team.members.filter((m) => m.toString() !== memberId) as never;

    const target = await Character.findById(memberId).select("teamIds teamId");
    if (target) {
      target.teamIds = (target.teamIds ?? []).filter((t) => t.toString() !== id) as never;
      if (target.teamId?.toString() === id)
        target.teamId = (target.teamIds[0] ?? undefined) as never;
      await target.save();
    }

    await team.save();
    return ok({ message: "Member kicked from team" });
  } catch (e) {
    console.error("[team kick]", e);
    return err("Server error", 500);
  }
}
