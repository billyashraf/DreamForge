import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import ChatMessage from "@/models/ChatMessage";

const RATE_LIMIT_MS = 60_000;

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id teamId");
  if (!character?.teamId) return err("Not in a team", 400);

  const messages = await ChatMessage.find({ type: "team", groupId: character.teamId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return ok({ messages: messages.reverse() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) return err("content is required");
  const content = body.content.trim();
  if (content.length > 300) return err("Message too long (max 300 chars)");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId })
    .select("_id name teamId lastTeamMessage isDead");
  if (!character) return err("Character not found", 404);
  if (!character.teamId) return err("Not in a team", 400);
  if (character.isDead) return err("Cannot communicate while dead");

  if (character.lastTeamMessage) {
    const elapsed = Date.now() - character.lastTeamMessage.getTime();
    if (elapsed < RATE_LIMIT_MS) {
      const secsLeft = Math.ceil((RATE_LIMIT_MS - elapsed) / 1_000);
      return err(`Telepathy cooling down — wait ${secsLeft}s`);
    }
  }

  await ChatMessage.create({
    type: "team",
    groupId: character.teamId,
    characterId: character._id,
    characterName: character.name,
    content,
  });

  character.lastTeamMessage = new Date();
  await character.save();

  return ok({ message: "Sent" });
}
