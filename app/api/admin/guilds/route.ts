import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
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
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const search = url.searchParams.get("search") ?? "";
  const limit = 20;

  const query = search
    ? { $or: [{ name: new RegExp(search, "i") }, { tag: new RegExp(search, "i") }] }
    : {};

  const [guilds, total] = await Promise.all([
    Guild.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("leaderId", "name level")
      .lean(),
    Guild.countDocuments(query),
  ]);

  return ok({
    guilds: guilds.map((g) => ({
      _id: g._id.toString(),
      name: g.name,
      tag: g.tag,
      membersCount: g.members.length,
      marsRating: g.marsRating,
      isSuspended: g.isSuspended ?? false,
      leader: g.leaderId as unknown as { name: string; level: number } | null,
      createdAt: g.createdAt,
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
  if (!body?.guildId || !body?.action) return err("guildId and action required");

  const { guildId, action } = body;

  await connectDB();

  const guild = await Guild.findById(guildId);
  if (!guild) return err("Guild not found", 404);

  switch (action) {
    case "suspend":
      guild.isSuspended = true;
      await guild.save();
      return ok({ message: `Guild [${guild.tag}] ${guild.name} suspended` });

    case "unsuspend":
      guild.isSuspended = false;
      await guild.save();
      return ok({ message: `Guild [${guild.tag}] ${guild.name} unsuspended` });

    case "delete": {
      const memberIds = guild.members.map((m) => m.toString());
      await Character.updateMany({ _id: { $in: memberIds } }, { $pull: { guildIds: guild._id } });
      await Character.updateMany(
        { _id: { $in: memberIds }, guildId: guild._id },
        { $unset: { guildId: "" } }
      );
      await Guild.findByIdAndDelete(guildId);
      return ok({ message: `Guild [${guild.tag}] ${guild.name} deleted` });
    }

    default:
      return err("Unknown action");
  }
}
