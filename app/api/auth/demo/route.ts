import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken, createSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/response";
import { DEMO_CREDENTIALS, seed } from "@/lib/seed";
import User from "@/models/User";
import Character from "@/models/Character";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`demo:${ip}`, 20, 60 * 1000)) {
    return err("Too many demo login attempts.", 429);
  }

  const body = await req.json().catch(() => ({}));
  const type = body?.type === "admin" ? "admin" : "player";
  const creds = DEMO_CREDENTIALS[type];

  try {
    await connectDB();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[demo] connectDB failed:", msg);
    return err(`Database unavailable: ${msg}`, 503);
  }

  let user = await User.findOne({ email: creds.email });
  if (!user) {
    await seed();
    user = await User.findOne({ email: creds.email });
    if (!user) return err("Demo account setup failed.", 500);
  }

  if (user.isBanned) return err("Demo account is currently disabled.", 403);

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  const character = await Character.findOne({ userId: user._id }).select(
    "name level experience health maxHealth energy maxEnergy credits strength intelligence agility skills currentLocation guildId teamId lastEnergyRegen shadowForm merits pain maxPain madness lastPainUpdate"
  );

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const cookie = createSessionCookie(token);

  const response = ok({
    message: `Logged in as demo ${type}`,
    user: { id: user._id, username: user.username, email: user.email, role: user.role },
    hasCharacter: !!character,
    character: character
      ? { id: character._id.toString(), ...character.toObject() }
      : null,
  });
  response.headers.set("Set-Cookie", cookie);
  return response;
}
