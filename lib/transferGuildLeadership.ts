import Guild from "@/models/Guild";
import Character from "@/models/Character";
import { createLog } from "@/lib/log";
import { Types } from "mongoose";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Lazily checks whether a guild's leader has been inactive for 2+ days.
 * If so, transfers leadership to the Queen-position holder, or the
 * oldest member (first in guild.members) if no Queen exists.
 * Returns the new leader's name if a transfer occurred, null otherwise.
 */
export async function transferGuildLeadershipIfInactive(
  guildId: string | Types.ObjectId
): Promise<string | null> {
  const guild = await Guild.findById(guildId);
  if (!guild || guild.members.length === 0) return null;

  const leader = await Character.findById(guild.leaderId).select("_id name updatedAt").lean();
  if (!leader) return null;

  const inactive = Date.now() - new Date(leader.updatedAt).getTime() > TWO_DAYS_MS;
  if (!inactive) return null;

  // --- Find successor ---
  let newLeaderId: Types.ObjectId | null = null;
  let newLeaderName = "";

  // 1. Queen position holder (first one found)
  const queenEntry = (guild.memberPositions ?? []).find((p) =>
    (p.positions ?? []).includes("queen" as never)
  );
  if (queenEntry) {
    const queenChar = await Character.findById(queenEntry.memberId).select("_id name").lean();
    if (queenChar) {
      newLeaderId = queenChar._id as Types.ObjectId;
      newLeaderName = queenChar.name;
    }
  }

  // 2. Oldest member (earliest in members array)
  if (!newLeaderId) {
    for (const memberId of guild.members) {
      const memberChar = await Character.findById(memberId).select("_id name").lean();
      if (memberChar) {
        newLeaderId = memberChar._id as Types.ObjectId;
        newLeaderName = memberChar.name;
        break;
      }
    }
  }

  if (!newLeaderId) return null;

  const oldLeaderId = guild.leaderId;
  const oldLeaderName = leader.name;
  const newLeaderIdStr = newLeaderId.toString();

  // Remove new leader from members (they become king, not a regular member)
  guild.members = guild.members.filter(
    (m) => m.toString() !== newLeaderIdStr
  ) as typeof guild.members;

  // Remove new leader's position entries (king has no position slot)
  guild.memberPositions = (guild.memberPositions ?? []).filter(
    (p) => p.memberId.toString() !== newLeaderIdStr
  ) as typeof guild.memberPositions;

  // Old leader becomes a regular member
  guild.members.push(oldLeaderId as never);

  // Assign new leader
  guild.leaderId = newLeaderId as never;

  await guild.save();

  // Activity logs for both parties
  await Promise.all([
    createLog(
      oldLeaderId.toString(),
      "guild_leader_transfer",
      `Leadership of [${guild.tag}] ${guild.name} was transferred to ${newLeaderName} after 2 days of inactivity`
    ),
    createLog(
      newLeaderId.toString(),
      "guild_leader_transfer",
      `You are now the leader of [${guild.tag}] ${guild.name} (previous leader ${oldLeaderName} was inactive for 2+ days)`
    ),
  ]);

  return newLeaderName;
}
