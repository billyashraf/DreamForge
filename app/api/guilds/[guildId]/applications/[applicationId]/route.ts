import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Guild from "@/models/Guild";
import Character from "@/models/Character";
import GuildApplication from "@/models/GuildApplication";

type Ctx = { params: Promise<{ guildId: string; applicationId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { guildId, applicationId } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.action || !["accept", "reject"].includes(body.action)) {
    return err('action must be "accept" or "reject"');
  }

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id");
  if (!character) return err("Character not found", 404);

  const guild = await Guild.findById(guildId);
  if (!guild) return err("Guild not found", 404);

  const isLeader = guild.leaderId.toString() === character._id.toString();
  const isOfficer = guild.officers.some((id) => id.toString() === character._id.toString());
  if (!isLeader && !isOfficer) return err("Only guild leaders and officers can review applications.", 403);

  const application = await GuildApplication.findById(applicationId);
  if (!application || application.guildId.toString() !== guildId) {
    return err("Application not found", 404);
  }
  if (application.status !== "pending") return err("Application already reviewed.");

  if (body.action === "reject") {
    application.status = "rejected";
    await application.save();
    return ok({ message: `Application from ${application.characterName} rejected.` });
  }

  // Accept: add to guild + character
  const applicant = await Character.findById(application.characterId);
  if (!applicant) {
    application.status = "rejected";
    await application.save();
    return err("Applicant character no longer exists.");
  }

  const alreadyIn = applicant.guildIds?.some((id) => id.toString() === guildId);
  if (!alreadyIn) {
    guild.members.push(applicant._id as never);
    await guild.save();

    applicant.guildIds = [...(applicant.guildIds ?? []), guild._id as never];
    if (!applicant.guildId) applicant.guildId = guild._id as never;
    await applicant.save();
  }

  application.status = "accepted";
  await application.save();

  return ok({ message: `${application.characterName} has been accepted into [${guild.tag}] ${guild.name}!` });
}
