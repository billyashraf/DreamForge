import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import GuildApplication from "@/models/GuildApplication";

type Ctx = { params: Promise<{ guildId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { guildId } = await params;

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id");
  if (!character) return err("Character not found", 404);

  const guild = await Guild.findById(guildId);
  if (!guild) return err("Guild not found", 404);

  const isLeader = guild.leaderId.toString() === character._id.toString();
  const isOfficer = guild.officers.some((id) => id.toString() === character._id.toString());
  if (!isLeader && !isOfficer) return err("Only guild leaders and officers can view applications.", 403);

  const applications = await GuildApplication.find({ guildId, status: "pending" })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  return ok({ applications });
}
