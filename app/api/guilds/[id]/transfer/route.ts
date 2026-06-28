import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import { createLog } from "@/lib/log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { newLeaderId } = body as { newLeaderId?: string };

    if (!newLeaderId) return err("newLeaderId is required");

    await connectDB();

    const [guild, character] = await Promise.all([
      Guild.findById(id),
      Character.findOne({ userId: session.userId }).select("_id name"),
    ]);

    if (!guild) return err("Guild not found", 404);
    if (!character) return err("Character not found", 404);

    const charIdStr = character._id.toString();
    if (guild.leaderId.toString() !== charIdStr) return forbidden();
    if (newLeaderId === charIdStr) return err("You are already the leader");

    const isMember = guild.members.some((m) => m.toString() === newLeaderId);
    if (!isMember) return err("Target is not a member of this guild");

    const newLeaderChar = await Character.findById(newLeaderId).select("_id name").lean();
    if (!newLeaderChar) return err("Target character not found");

    // Remove new leader from members array (they become king)
    guild.members = guild.members.filter(
      (m) => m.toString() !== newLeaderId
    ) as typeof guild.members;

    // Remove new leader's position entries (king has no position slot)
    guild.memberPositions = (guild.memberPositions ?? []).filter(
      (p) => p.memberId.toString() !== newLeaderId
    ) as typeof guild.memberPositions;

    // Old leader drops to regular member
    guild.members.push(character._id as never);

    guild.leaderId = newLeaderChar._id as never;

    await guild.save();

    await Promise.all([
      createLog(
        charIdStr,
        "guild_leader_transfer",
        `Transferred leadership of [${guild.tag}] ${guild.name} to ${newLeaderChar.name}`
      ),
      createLog(
        newLeaderId,
        "guild_leader_transfer",
        `${character.name} transferred leadership of [${guild.tag}] ${guild.name} to you`
      ),
    ]);

    return ok({ message: `Leadership transferred to ${newLeaderChar.name}` });
  } catch (e) {
    console.error("[transfer guild leadership]", e);
    return err("Server error", 500);
  }
}
