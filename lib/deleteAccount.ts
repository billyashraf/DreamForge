import { Types } from "mongoose";
import User from "@/models/User";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";

/**
 * Fully removes a user and their character from the database.
 * - Guilds they lead: transferred to first member, or disbanded if empty.
 * - Teams they lead: transferred to first member, or disbanded if empty.
 * - Guilds/teams they belong to as member: removed.
 * - Character document deleted, then user document deleted.
 */
export async function deleteAccount(userId: string | Types.ObjectId): Promise<void> {
  const character = await Character.findOne({ userId });

  if (character) {
    const charId = character._id as Types.ObjectId;

    // --- Guilds led by this character ---
    const ledGuilds = await Guild.find({ leaderId: charId });
    for (const guild of ledGuilds) {
      if (guild.members.length > 0) {
        // Transfer leadership to the first member
        const newLeaderId = guild.members[0];
        guild.leaderId = newLeaderId as never;
        guild.members = guild.members.filter(
          (m) => m.toString() !== newLeaderId.toString()
        ) as typeof guild.members;
        guild.memberPositions = (guild.memberPositions ?? []).filter(
          (p) => p.memberId.toString() !== newLeaderId.toString()
        ) as typeof guild.memberPositions;
        await guild.save();
      } else {
        await Guild.findByIdAndDelete(guild._id);
      }
    }

    // Remove from guilds as a regular member
    const memberOfGuilds = await Guild.find({ members: charId });
    for (const guild of memberOfGuilds) {
      guild.members = guild.members.filter(
        (m) => m.toString() !== charId.toString()
      ) as typeof guild.members;
      guild.memberPositions = (guild.memberPositions ?? []).filter(
        (p) => p.memberId.toString() !== charId.toString()
      ) as typeof guild.memberPositions;
      guild.memberRanks = (guild.memberRanks ?? []).filter(
        (r) => r.memberId.toString() !== charId.toString()
      ) as typeof guild.memberRanks;
      await guild.save();
    }

    // --- Teams led by this character ---
    const ledTeams = await Team.find({ leaderId: charId });
    for (const team of ledTeams) {
      if (team.members.length > 0) {
        const newLeaderId = team.members[0];
        team.leaderId = newLeaderId as never;
        team.members = team.members.filter(
          (m) => m.toString() !== newLeaderId.toString()
        ) as typeof team.members;
        await team.save();
      } else {
        await Team.findByIdAndDelete(team._id);
      }
    }

    // Remove from teams as a regular member
    await Team.updateMany({ members: charId }, { $pull: { members: charId } });

    // Remove character references from other characters' guildIds/teamIds
    await Character.updateMany(
      {},
      { $pull: { guildIds: charId, teamIds: charId } }
    );

    await character.deleteOne();
  }

  await User.findByIdAndDelete(userId);
}
