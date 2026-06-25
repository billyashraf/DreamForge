import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { session: null, error: unauthorized() };
  if (session.role !== "admin" && session.role !== "moderator") return { session: null, error: forbidden() };
  return { session, error: null };
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  await connectDB();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const search = url.searchParams.get("search") ?? "";
  const limit = 20;

  const query = search ? { name: new RegExp(search, "i") } : {};

  const [teams, total] = await Promise.all([
    Team.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("leaderId", "name level")
      .lean(),
    Team.countDocuments(query),
  ]);

  return ok({
    teams: teams.map((t) => ({
      _id: t._id.toString(),
      name: t.name,
      activity: t.activity,
      membersCount: t.members.length,
      maxSize: t.maxSize,
      isOpen: t.isOpen,
      isSuspended: t.isSuspended ?? false,
      leader: t.leaderId as unknown as { name: string; level: number } | null,
      createdAt: t.createdAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const body = await req.json().catch(() => null);
  if (!body?.teamId || !body?.action) return err("teamId and action required");

  const { teamId, action } = body;

  await connectDB();

  const team = await Team.findById(teamId);
  if (!team) return err("Team not found", 404);

  switch (action) {
    case "suspend":
      team.isSuspended = true;
      await team.save();
      return ok({ message: `Team "${team.name}" suspended` });

    case "unsuspend":
      team.isSuspended = false;
      await team.save();
      return ok({ message: `Team "${team.name}" unsuspended` });

    case "delete": {
      if (session.role !== "admin") return forbidden();
      const memberIds = team.members.map((m) => m.toString());
      await Character.updateMany({ _id: { $in: memberIds } }, { $pull: { teamIds: team._id } });
      await Character.updateMany(
        { _id: { $in: memberIds }, teamId: team._id },
        { $unset: { teamId: "" } }
      );
      await Team.findByIdAndDelete(teamId);
      return ok({ message: `Team "${team.name}" deleted` });
    }

    default:
      return err("Unknown action");
  }
}
