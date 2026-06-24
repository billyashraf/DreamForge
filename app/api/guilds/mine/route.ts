import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Guild from "@/models/Guild";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id guildIds");
  if (!character?.guildIds?.length) return ok({ owned: [], joined: [] });

  const guilds = await Guild.find({ _id: { $in: character.guildIds } })
    .select("name tag leaderId")
    .lean();

  const charIdStr = character._id.toString();
  const owned = guilds
    .filter((g) => g.leaderId.toString() === charIdStr)
    .map((g) => ({ _id: g._id.toString(), name: g.name, tag: g.tag }));
  const joined = guilds
    .filter((g) => g.leaderId.toString() !== charIdStr)
    .map((g) => ({ _id: g._id.toString(), name: g.name, tag: g.tag }));

  return ok({ owned, joined });
}
