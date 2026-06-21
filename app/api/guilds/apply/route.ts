import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import GuildApplication from "@/models/GuildApplication";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.guildId) return err("guildId is required");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  if (character.isDead) return err("You cannot apply to guilds while dead. Respawn first.");

  const alreadyIn = character.guildIds?.some((id) => id.toString() === body.guildId);
  if (alreadyIn) return err("You are already a member of this guild.");

  const guild = await Guild.findById(body.guildId);
  if (!guild) return err("Guild not found", 404);

  const existing = await GuildApplication.findOne({
    characterId: character._id,
    guildId: guild._id,
    status: "pending",
  });
  if (existing) return err("You already have a pending application to this guild.");

  const application = await GuildApplication.create({
    characterId: character._id,
    characterName: character.name,
    guildId: guild._id,
  });

  return ok({
    message: `Application submitted to [${guild.tag}] ${guild.name}. Awaiting leader review.`,
    applicationId: application._id.toString(),
  }, 201);
}
