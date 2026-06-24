import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";

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
      Character.findOne({ userId: session.userId }).select("_id"),
      Character.findById(targetCharacterId).select("_id name guildIds teamIds teamId guildId"),
    ]);

    if (!inviter) return err("Character not found", 404);
    if (!target) return err("Target character not found", 404);
    if (target._id.toString() === inviter._id.toString()) return err("Cannot invite yourself");

    if (type === "guild") {
      const guild = await Guild.findById(entityId);
      if (!guild) return err("Guild not found", 404);
      if (guild.leaderId.toString() !== inviter._id.toString()) {
        // also allow queen
        const isQueen = (guild.memberPositions ?? []).some(
          (p) => p.memberId.toString() === inviter._id.toString() &&
            (p.positions ?? []).includes("queen" as never)
        );
        if (!isQueen) return err("Only the guild leader or queen can invite", 403);
      }

      const alreadyMember = guild.members.some((m) => m.toString() === target._id.toString());
      if (alreadyMember) return err("Player is already in this guild");

      if ((target.guildIds ?? []).length >= 49)
        return err("Player has reached the maximum of 49 guild memberships");

      guild.members.push(target._id as never);
      target.guildIds = [...(target.guildIds ?? []), guild._id as never];
      if (!target.guildId) target.guildId = guild._id as never;
      await Promise.all([guild.save(), target.save()]);

      return ok({ message: `${target.name} has been added to [${guild.tag}] ${guild.name}` });
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

    team.members.push(target._id as never);
    target.teamIds = [...(target.teamIds ?? []), team._id as never];
    if (!target.teamId) target.teamId = team._id as never;
    await Promise.all([team.save(), target.save()]);

    return ok({ message: `${target.name} has been added to team "${team.name}"` });
  } catch (e) {
    console.error("[invite]", e);
    return err("Server error", 500);
  }
}
