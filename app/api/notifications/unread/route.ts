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

  const count = await Notification.countDocuments({
    recipientId: character._id,
    status: "pending",
  });

  return ok({ count });
}
