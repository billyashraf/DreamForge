import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const message = (body.message ?? "").slice(0, 300);

    await connectDB();

    const [character, guild] = await Promise.all([
      Character.findOne({ userId: session.userId }).select("_id guildIds shadowForm"),
      Guild.findById(id),
    ]);

    if (!character) return err("Character not found", 404);
    if (!guild) return err("Guild not found", 404);

    if (character.shadowForm !== "caster" && character.shadowForm !== "assassin")
      return err("Only Caster or Assassin form may join guilds");

    if (!guild.applications) guild.applications = [];

    const charIdStr = character._id.toString();
    const alreadyMember = guild.members.some((m) => m.toString() === charIdStr);
    if (alreadyMember) return err("You are already a member of this guild");

    const alreadyApplied = guild.applications.some(
      (a) => a.characterId.toString() === charIdStr
    );
    if (alreadyApplied) return err("You already have a pending application");

    guild.applications.push({
      characterId: character._id as never,
      message,
      appliedAt: new Date(),
    });
    await guild.save();

    return ok({ message: `Application sent to [${guild.tag}] ${guild.name}` });
  } catch (e) {
    console.error("[apply]", e);
    return err("Server error", 500);
  }
}
