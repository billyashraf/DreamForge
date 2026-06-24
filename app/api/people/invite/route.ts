import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { createLog } from "@/lib/log";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";
import Notification from "@/models/Notification";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body?.targetCharacterId || !body?.entityId || !["guild", "team"].includes(body?.type))
      return err("targetCharacterId, entityId and type (guild|team) required");

    const { targetCharacterId, entityId, type } = body as {
      targetCharacterId: string;
      entityId: string;
      type: "guild" | "team";
    };

    await connectDB();

    const [inviter, target] = await Promise.all([
      Character.findOne({ userId: session.userId }).select("_id name"),
      Character.findById(targetCharacterId).select("_id name guildIds teamIds"),
    ]);

    if (!inviter) return err("Character not found", 404);
    if (!target) return err("Target character not found", 404);
    if (target._id.toString() === inviter._id.toString()) return err("Cannot invite yourself");

    if (type === "guild") {
      const guild = await Guild.findById(entityId);
      if (!guild) return err("Guild not found", 404);

      const isLeader = guild.leaderId.toString() === inviter._id.toString();
      if (!isLeader) {
        const isQueen = (guild.memberPositions ?? []).some(
          (p) =>
            p.memberId.toString() === inviter._id.toString() &&
            (p.positions ?? []).includes("queen" as never)
        );
        if (!isQueen) return err("Only the guild leader or queen can invite", 403);
      }

      const alreadyMember = guild.members.some((m) => m.toString() === target._id.toString());
      if (alreadyMember) return err("Player is already in this guild");

      if ((target.guildIds ?? []).length >= 49)
        return err("Player has reached the maximum of 49 guild memberships");

      const alreadyInvited = await Notification.findOne({
        recipientId: target._id,
        entityId: guild._id,
        type: "guild_invite",
        status: "pending",
      });
      if (alreadyInvited) return err("Player already has a pending invite to this guild");

      await Notification.create({
        recipientId: target._id,
        senderId: inviter._id,
        senderName: inviter.name,
        type: "guild_invite",
        entityId: guild._id,
        entityName: guild.name,
        entityTag: guild.tag,
      });

      await createLog(
        inviter._id,
        "invite_sent",
        `Sent guild invite to ${target.name} for [${guild.tag}] ${guild.name}`
      );

      return ok({ message: `Invite sent to ${target.name} for [${guild.tag}] ${guild.name}` });
    }

    // type === "team"
    const team = await Team.findById(entityId);
    if (!team) return err("Team not found", 404);
    if (team.leaderId.toString() !== inviter._id.toString())
      return err("Only the team leader can invite", 403);

    const alreadyMember = team.members.some((m) => m.toString() === target._id.toString());
    if (alreadyMember) return err("Player is already in this team");

    if (team.members.length >= team.maxSize) return err("Team is full");

    if ((target.teamIds ?? []).length >= 19)
      return err("Player has reached the maximum of 19 team memberships");

    const alreadyInvited = await Notification.findOne({
      recipientId: target._id,
      entityId: team._id,
      type: "team_invite",
      status: "pending",
    });
    if (alreadyInvited) return err("Player already has a pending invite to this team");

    await Notification.create({
      recipientId: target._id,
      senderId: inviter._id,
      senderName: inviter.name,
      type: "team_invite",
      entityId: team._id,
      entityName: team.name,
    });

    await createLog(
      inviter._id,
      "invite_sent",
      `Sent team invite to ${target.name} for team "${team.name}"`
    );

    return ok({ message: `Invite sent to ${target.name} for team "${team.name}"` });
  } catch (e) {
    console.error("[invite]", e);
    return err("Server error", 500);
  }
}
