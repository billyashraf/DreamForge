import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import GuildApplication from "@/models/GuildApplication";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id");
  if (!character) return err("Character not found", 404);

  const applications = await GuildApplication.find({ characterId: character._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return ok({ applications });
}
