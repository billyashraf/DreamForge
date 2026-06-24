import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import { createLog } from "@/lib/log";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;

    await connectDB();

    const [character, guild] = await Promise.all([
      Character.findOne({ userId: session.userId }).select("_id guildId guildIds"),
      Guild.findById(id),
    ]);

    if (!character) return err("Character not found", 404);
    if (!guild) return err("Guild not found", 404);

    const charIdStr = character._id.toString();

    const isMember = guild.members.some((m) => m.toString() === charIdStr);
    if (!isMember) return err("You are not a member of this guild");

    if (guild.leaderId.toString() === charIdStr)
      return err("Guild leader cannot leave. Transfer leadership or disband the guild first.");

    guild.members = guild.members.filter((m) => m.toString() !== charIdStr) as never;
    if (guild.memberRanks) {
      guild.memberRanks = guild.memberRanks.filter(
        (r) => r.memberId.toString() !== charIdStr
      ) as never;
    }

    character.guildIds = (character.guildIds ?? []).filter(
      (g) => g.toString() !== id
    ) as never;

    if (character.guildId?.toString() === id) {
      character.guildId = (character.guildIds[0] ?? null) as never;
    }

    await Promise.all([guild.save(), character.save()]);

    await createLog(
      character._id,
      "guild_left",
      `Left guild [${guild.tag}] ${guild.name}`
    );

    return ok({ message: `You left [${guild.tag}] ${guild.name}` });
  } catch (e) {
    console.error("[leave]", e);
    return err("Server error", 500);
  }
}
