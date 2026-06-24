import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

const VALID_POSITIONS = new Set([
  "king","queen","rook","bishop","knight","pawn",
  "saber","lancer","rider","caster","berserker","archer","assassin","demon",
]);

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

    const { memberId, positions } = body as { memberId: string; positions: string[] };

    if (!Array.isArray(positions)) return err("positions must be an array");
    if (positions.length > 3) return err("Maximum 3 positions per member");
    if (positions.some((p) => !VALID_POSITIONS.has(p))) return err("Invalid position in list");

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

    const existing = guild.memberPositions.find((p) => p.memberId.toString() === memberId);

    if (positions.length === 0) {
      guild.memberPositions = guild.memberPositions.filter(
        (p) => p.memberId.toString() !== memberId
      ) as never;
    } else if (existing) {
      existing.positions = positions as never;
    } else {
      guild.memberPositions.push({ memberId: memberId as never, positions: positions as never });
    }

    guild.markModified("memberPositions");
    await guild.save();

    return ok({ message: positions.length ? `Ranks updated` : "Ranks cleared — Recruit" });
  } catch (e) {
    console.error("[position]", e);
    return err("Server error", 500);
  }
}
