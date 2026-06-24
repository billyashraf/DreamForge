import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

const VALID_POSITIONS = [
  "king","queen","rook","bishop","knight","pawn",
  "saber","lancer","rider","caster","berserker","archer","assassin",
  "demon",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body?.memberId) return err("memberId required");

    const { memberId, position } = body;

    if (position !== null && !VALID_POSITIONS.includes(position))
      return err("Invalid position");

    await connectDB();

    const [guild, viewer] = await Promise.all([
      Guild.findById(id),
      Character.findOne({ userId: session.userId }).select("_id"),
    ]);

    if (!guild) return err("Guild not found", 404);
    if (!viewer) return err("Character not found", 404);
    if (guild.leaderId.toString() !== viewer._id.toString()) return forbidden();

    const isMember = guild.members.some((m) => m.toString() === memberId);
    if (!isMember) return err("That character is not a member of this guild");

    if (!guild.memberPositions) guild.memberPositions = [];

    if (position === null) {
      // Clear rank → back to Recruit
      guild.memberPositions = guild.memberPositions.filter(
        (p) => p.memberId.toString() !== memberId
      ) as never;
    } else {
      const existing = guild.memberPositions.find((p) => p.memberId.toString() === memberId);
      if (existing) {
        existing.position = position;
      } else {
        guild.memberPositions.push({ memberId: memberId as never, position });
      }
    }

    // Required — Mongoose won't detect mutations of nested array elements without this
    guild.markModified("memberPositions");
    await guild.save();

    return ok({ message: position ? `Rank set to ${position}` : "Rank cleared — now Recruit" });
  } catch (e) {
    console.error("[position]", e);
    return err("Server error", 500);
  }
}
