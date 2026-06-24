import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id teamIds").lean();
  if (!character) return err("Character not found", 404);

  const charId = character._id;
  const ids = character.teamIds ?? [];

  const [owned, joined] = await Promise.all([
    Team.find({ _id: { $in: ids }, leaderId: charId }).lean(),
    Team.find({ _id: { $in: ids }, leaderId: { $ne: charId } })
      .populate("leaderId", "name level")
      .lean(),
  ]);

  return ok({ owned, joined });
}
