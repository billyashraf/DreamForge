import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { createLog } from "@/lib/log";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";
import Notification from "@/models/Notification";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    await connectDB();

    const character = await Character.findOne({ userId: session.userId }).select(
      "_id name guildIds teamIds guildId teamId"
    );
    if (!character) return unauthorized();

    const notif = await Notification.findById(id);
    if (!notif) return err("Notification not found", 404);
    if (notif.recipientId.toString() !== character._id.toString())
      return err("Not your notification", 403);
    if (notif.status !== "pending") return err("Invite already responded to");

    if (notif.type === "guild_invite") {
      const guild = await Guild.findById(notif.entityId);
      if (!guild) return err("Guild no longer exists", 404);

      const alreadyMember = guild.members.some((m) => m.toString() === character._id.toString());
      if (alreadyMember) {
        notif.status = "accepted";
        await notif.save();
        return ok({ message: "You are already a member of this guild" });
      }

      if ((character.guildIds ?? []).length >= 49)
        return err("You have reached the maximum of 49 guild memberships");

      guild.members.push(character._id as never);
      if (!guild.memberRanks) guild.memberRanks = [];
      guild.memberRanks.push({ memberId: character._id as never, rank: "pawn" });
      character.guildIds = [...(character.guildIds ?? []), guild._id as never];
      if (!character.guildId) character.guildId = guild._id as never;

      notif.status = "accepted";
      await Promise.all([guild.save(), character.save(), notif.save()]);

      await createLog(
        character._id,
        "guild_joined",
        `Accepted invite and joined guild [${guild.tag}] ${guild.name}`
      );
      return ok({ message: `You joined [${guild.tag}] ${guild.name}` });
    }

    if (notif.type === "team_invite") {
      const team = await Team.findById(notif.entityId);
      if (!team) return err("Team no longer exists", 404);

      const alreadyMember = team.members.some((m) => m.toString() === character._id.toString());
      if (alreadyMember) {
        notif.status = "accepted";
        await notif.save();
        return ok({ message: "You are already a member of this team" });
      }

      if (team.members.length >= team.maxSize) return err("Team is now full");
      if ((character.teamIds ?? []).length >= 19)
        return err("You have reached the maximum of 19 team memberships");

      team.members.push(character._id as never);
      character.teamIds = [...(character.teamIds ?? []), team._id as never];
      if (!character.teamId) character.teamId = team._id as never;

      notif.status = "accepted";
      await Promise.all([team.save(), character.save(), notif.save()]);

      await createLog(
        character._id,
        "team_joined",
        `Accepted invite and joined team "${team.name}"`
      );
      return ok({ message: `You joined team "${team.name}"` });
    }

    return err("This notification cannot be accepted");
  } catch (e) {
    console.error("[notif accept]", e);
    return err("Server error", 500);
  }
}
