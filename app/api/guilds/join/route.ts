import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.guildId) return err("guildId is required");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  // Prevent joining the same guild twice
  const alreadyIn = character.guildIds?.some((id) => id.toString() === body.guildId);
  if (alreadyIn) return err("Already a member of this guild");

  const guild = await Guild.findById(body.guildId);
  if (!guild) return err("Guild not found", 404);

  guild.members.push(character._id as never);
  await guild.save();

  character.guildIds = [...(character.guildIds ?? []), guild._id as never];
  if (!character.guildId) character.guildId = guild._id as never;
  await character.save();

  return ok({
    message: `You joined [${guild.tag}] ${guild.name}!`,
    guildId: guild._id.toString(),
    guildIds: character.guildIds.map((id) => id.toString()),
  });
}
