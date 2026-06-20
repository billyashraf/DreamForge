import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Message from "@/models/Message";

const OWL_FLIGHT_MS = 10 * 60 * 1_000; // 10 minutes

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.toCharacterId || !body?.content?.trim()) {
    return err("toCharacterId and content are required");
  }
  const content = body.content.trim();
  if (content.length > 500) return err("Message too long (max 500 chars)");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id name owlReturnAt");
  if (!character) return err("Character not found", 404);

  if (character.owlReturnAt && character.owlReturnAt > new Date()) {
    const msLeft = character.owlReturnAt.getTime() - Date.now();
    const minsLeft = Math.ceil(msLeft / 60_000);
    return err(`Owl is in flight — returns in ~${minsLeft} minute${minsLeft !== 1 ? "s" : ""}`);
  }

  if (body.toCharacterId === character._id.toString()) {
    return err("You cannot send a message to yourself");
  }

  const recipient = await Character.findById(body.toCharacterId).select("name");
  if (!recipient) return err("Recipient not found", 404);

  const now = new Date();
  const deliveredAt = new Date(now.getTime() + OWL_FLIGHT_MS);

  await Message.create({
    fromCharacterId: character._id,
    fromName: character.name,
    toCharacterId: recipient._id,
    toName: recipient.name,
    content,
    sentAt: now,
    deliveredAt,
    read: false,
  });

  character.owlReturnAt = deliveredAt;
  await character.save();

  return ok({
    message: `Shadow Owl dispatched to ${recipient.name}. Arrives in 10 minutes.`,
    owlReturnAt: character.owlReturnAt,
  });
}
