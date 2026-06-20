import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import ChatMessage from "@/models/ChatMessage";

const RATE_LIMIT_MS = 60_000;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id guildIds");
  if (!character?.guildIds?.length) return err("Not in any guild", 400);

  const targetId = guildId ?? character.guildIds[0].toString();
  const inGuild = character.guildIds.some((id) => id.toString() === targetId);
  if (!inGuild) return err("Not a member of that guild", 403);

  const messages = await ChatMessage.find({ type: "guild", groupId: targetId })
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
    .select("_id name guildIds lastGuildMessage isDead");
  if (!character) return err("Character not found", 404);
  if (!character.guildIds?.length) return err("Not in any guild", 400);
  if (character.isDead) return err("Cannot communicate while dead");

  const targetId = body.guildId ?? character.guildIds[0].toString();
  const inGuild = character.guildIds.some((id) => id.toString() === targetId);
  if (!inGuild) return err("Not a member of that guild", 403);

  if (character.lastGuildMessage) {
    const elapsed = Date.now() - character.lastGuildMessage.getTime();
    if (elapsed < RATE_LIMIT_MS) {
      const secsLeft = Math.ceil((RATE_LIMIT_MS - elapsed) / 1_000);
      return err(`Echo cooling down — wait ${secsLeft}s`);
    }
  }

  await ChatMessage.create({
    type: "guild",
    groupId: targetId,
    characterId: character._id,
    characterName: character.name,
    content,
  });

  character.lastGuildMessage = new Date();
  await character.save();

  return ok({ message: "Sent" });
}
