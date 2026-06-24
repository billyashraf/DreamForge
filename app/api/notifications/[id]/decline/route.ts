import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { createLog } from "@/lib/log";
import Character from "@/models/Character";
import Notification from "@/models/Notification";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    await connectDB();

    const character = await Character.findOne({ userId: session.userId }).select("_id name");
    if (!character) return unauthorized();

    const notif = await Notification.findById(id);
    if (!notif) return err("Notification not found", 404);
    if (notif.recipientId.toString() !== character._id.toString())
      return err("Not your notification", 403);
    if (notif.status !== "pending") return err("Invite already responded to");

    if (!["guild_invite", "team_invite"].includes(notif.type))
      return err("This notification cannot be declined");

    notif.status = "declined";
    await notif.save();

    const label = notif.type === "guild_invite"
      ? `guild [${notif.entityTag ?? ""}] ${notif.entityName}`
      : `team "${notif.entityName}"`;

    await createLog(character._id, "invite_declined", `Declined invite to ${label}`);

    return ok({ message: `Invite to ${label} declined` });
  } catch (e) {
    console.error("[notif decline]", e);
    return err("Server error", 500);
  }
}
