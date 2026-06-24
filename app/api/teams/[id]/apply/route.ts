import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
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
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";

    await connectDB();

    const [team, applicant] = await Promise.all([
      Team.findById(id),
      Character.findOne({ userId: session.userId }).select("_id teamIds"),
    ]);

    if (!team) return err("Team not found", 404);
    if (!applicant) return err("Character not found", 404);

    if (!team.applications) team.applications = [];

    const alreadyMember = team.members.some((m) => m.toString() === applicant._id.toString());
    if (alreadyMember) return err("You are already in this team");

    const alreadyApplied = team.applications.some(
      (a) => a.characterId.toString() === applicant._id.toString()
    );
    if (alreadyApplied) return err("You already have a pending application");

    if ((applicant.teamIds ?? []).length >= 19)
      return err("You have reached the maximum of 19 team memberships");

    if (!team.isOpen || team.members.length >= team.maxSize)
      return err("This team is not accepting new members");

    team.applications.push({
      characterId: applicant._id as never,
      message,
      appliedAt: new Date(),
    });
    await team.save();

    return ok({ message: `Application sent to team "${team.name}"` });
  } catch (e) {
    console.error("[team apply]", e);
    return err("Server error", 500);
  }
}
