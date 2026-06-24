import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import { createLog } from "@/lib/log";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import Notification from "@/models/Notification";

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

    const [guild, viewer] = await Promise.all([
      Guild.findById(id),
      Character.findOne({ userId: session.userId }).select("_id"),
    ]);

    if (!guild) return err("Guild not found", 404);
    if (!viewer) return err("Character not found", 404);
    if (guild.leaderId.toString() !== viewer._id.toString()) return forbidden();
    if (memberId === viewer._id.toString()) return err("Cannot kick yourself");

    const isMember = guild.members.some((m) => m.toString() === memberId);
    if (!isMember) return err("That character is not a member of this guild");

    guild.members = guild.members.filter((m) => m.toString() !== memberId) as never;
    guild.memberPositions = (guild.memberPositions ?? []).filter(
      (p) => p.memberId.toString() !== memberId
    ) as never;
    guild.markModified("memberPositions");

    const target = await Character.findById(memberId).select("_id guildIds guildId");
    if (target) {
      target.guildIds = (target.guildIds ?? []).filter((g) => g.toString() !== id) as never;
      if (target.guildId?.toString() === id) {
        target.guildId = (target.guildIds[0] ?? null) as never;
      }
      await target.save();

      await Promise.all([
        createLog(target._id, "guild_kicked", `Kicked from guild [${guild.tag}] ${guild.name}`),
        createLog(viewer._id, "guild_kick_issued", `Kicked a member from guild [${guild.tag}] ${guild.name}`),
        Notification.create({
          recipientId: target._id,
          type: "guild_kick",
          entityId: guild._id,
          entityName: guild.name,
          entityTag: guild.tag,
          status: "pending",
        }),
      ]);
    }

    await guild.save();
    return ok({ message: "Member kicked from guild" });
  } catch (e) {
    console.error("[kick]", e);
    return err("Server error", 500);
  }
}
