import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    await connectDB();

    const team = await Team.findById(id).lean();
    if (!team) return err("Team not found", 404);

    const viewer = await Character.findOne({ userId: session.userId }).select("_id teamIds").lean();

    const memberIds = team.members.map((m) => m.toString());
    const memberDocs = await Character.find({ _id: { $in: memberIds } })
      .select("name level shadowForm")
      .lean();

    const leaderIdStr = team.leaderId.toString();
    const viewerCharId = viewer?._id.toString() ?? "";
    const isMember = memberIds.includes(viewerCharId);
    const isLeader = leaderIdStr === viewerCharId;

    const hasApplied = (team.applications ?? []).some(
      (a) => a.characterId.toString() === viewerCharId
    );

    const members = memberDocs.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      level: m.level,
      shadowForm: m.shadowForm,
      isLeader: m._id.toString() === leaderIdStr,
    }));

    members.sort((a, b) => {
      if (a.isLeader) return -1;
      if (b.isLeader) return 1;
      return b.level - a.level;
    });

    return ok({
      team: {
        _id: team._id.toString(),
        name: team.name,
        activity: team.activity,
        maxSize: team.maxSize,
        isOpen: team.isOpen,
        leaderId: leaderIdStr,
        createdAt: team.createdAt,
      },
      members,
      isMember,
      isLeader,
      viewerCharId,
      hasApplied,
    });
  } catch (e) {
    console.error("[team GET]", e);
    return err("Server error", 500);
  }
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

    const [team, character] = await Promise.all([
      Team.findById(id),
      Character.findOne({ userId: session.userId }).select("_id"),
    ]);

    if (!team) return err("Team not found", 404);
    if (!character) return err("Character not found", 404);
    if (team.leaderId.toString() !== character._id.toString()) return forbidden();

    const memberIds = team.members.map((m) => m.toString());
    await Character.updateMany({ _id: { $in: memberIds } }, { $pull: { teamIds: team._id } });
    await Character.updateMany(
      { _id: { $in: memberIds }, teamId: team._id },
      { $unset: { teamId: "" } }
    );
    await Team.findByIdAndDelete(id);

    return ok({ message: `Team "${team.name}" disbanded` });
  } catch (e) {
    console.error("[team DELETE]", e);
    return err("Server error", 500);
  }
}
