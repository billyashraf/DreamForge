import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Notification from "@/models/Notification";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id");
  if (!character) return unauthorized();

  // Mark informational notifications as read when fetched
  await Notification.updateMany(
    {
      recipientId: character._id,
      status: "pending",
      type: { $in: ["guild_app_accepted", "guild_app_rejected", "team_app_accepted", "team_app_rejected", "guild_kick", "team_kick"] },
    },
    { $set: { status: "read" } }
  );

  const notifications = await Notification.find({ recipientId: character._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return ok({ notifications });
}
