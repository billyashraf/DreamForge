import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken, createSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/response";
import { DEMO_CREDENTIALS } from "@/lib/seed";
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

  await connectDB();

  const user = await User.findOne({ email: creds.email });
  if (!user) {
    return err(
      "Demo accounts not seeded yet. POST /api/seed first.",
      404
    );
  }

  if (user.isBanned) return err("Demo account is currently disabled.", 403);

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  const character = await Character.findOne({ userId: user._id }).select(
    "name level currentLocation"
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
      ? { name: character.name, level: character.level, location: character.currentLocation }
      : null,
    isDemo: true,
  });
  response.headers.set("Set-Cookie", cookie);
  return response;
}
