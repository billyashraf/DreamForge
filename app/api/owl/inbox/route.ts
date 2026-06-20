import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Message from "@/models/Message";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id owlReturnAt");
  if (!character) return ok({ inbox: [], sent: [], owlReturnAt: null });

  const now = new Date();

  const [inbox, sent] = await Promise.all([
    Message.find({ toCharacterId: character._id, deliveredAt: { $lte: now } })
      .sort({ deliveredAt: -1 })
      .limit(20)
      .lean(),
    Message.find({ fromCharacterId: character._id })
      .sort({ sentAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Mark newly delivered messages as read
  await Message.updateMany(
    { toCharacterId: character._id, deliveredAt: { $lte: now }, read: false },
    { $set: { read: true } }
  );

  return ok({
    inbox,
    sent,
    owlReturnAt: character.owlReturnAt ?? null,
  });
}
