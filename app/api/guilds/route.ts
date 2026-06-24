import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { guildCreateSchema } from "@/lib/validations";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const guilds = await Guild.find()
    .sort({ marsRating: -1 })
    .limit(20)
    .populate("leaderId", "name level");

  return ok({ guilds });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON");

  const parsed = guildCreateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  if ((character.guildIds ?? []).length >= 49)
    return err("You have reached the maximum of 49 guild memberships");

  const ledCount = await Guild.countDocuments({ leaderId: character._id });
  if (ledCount >= 10) return err("You can lead a maximum of 10 guilds");

  if (character.level < 5) return err("You must be level 5 to create a guild");

  const { name, tag, description } = parsed.data;

  const existing = await Guild.findOne({ $or: [{ name }, { tag: tag.toUpperCase() }] });
  if (existing) return err("Guild name or tag already taken");

  const guild = await Guild.create({
    name,
    tag: tag.toUpperCase(),
    description,
    leaderId: character._id,
    members: [character._id],
  });

  character.guildId = guild._id as never;
  character.guildIds = [...(character.guildIds ?? []), guild._id as never];
  await character.save();

  return ok({ message: `Guild [${guild.tag}] ${guild.name} created!`, guild }, 201);
}
