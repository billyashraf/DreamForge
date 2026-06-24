import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";

const VALID_RANKS = ["queen", "rook", "bishop", "knight", "pawn"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.memberId || !body?.rank) return err("memberId and rank required");

  const { memberId, rank } = body;
  if (!VALID_RANKS.includes(rank)) return err(`Invalid rank. Must be one of: ${VALID_RANKS.join(", ")}`);

  await connectDB();

  const [guild, viewer] = await Promise.all([
    Guild.findById(id),
    Character.findOne({ userId: session.userId }).select("_id"),
  ]);

  if (!guild) return err("Guild not found", 404);
  if (!viewer) return err("Character not found", 404);

  if (guild.leaderId.toString() !== viewer._id.toString()) return forbidden();

  if (memberId === viewer._id.toString()) return err("Cannot change your own rank (you are King)");

  const isMember = guild.members.some((m) => m.toString() === memberId);
  if (!isMember) return err("That character is not a member of this guild");

  const existing = guild.memberRanks.find((r) => r.memberId.toString() === memberId);
  if (existing) {
    existing.rank = rank;
  } else {
    guild.memberRanks.push({ memberId: memberId as never, rank });
  }

  if (rank === "queen") {
    for (const r of guild.memberRanks) {
      if (r.memberId.toString() !== memberId && r.rank === "queen") {
        r.rank = "rook";
      }
    }
  }

  await guild.save();
  return ok({ message: `Rank updated to ${rank}` });
}
