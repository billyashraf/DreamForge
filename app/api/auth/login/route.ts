import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { signToken, createSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/response";
import User from "@/models/User";
import Character from "@/models/Character";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return err("Too many login attempts. Please wait 15 minutes.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON");

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) return err("Invalid email or password", 401);

  if (user.isBanned) {
    return err(`Account suspended. Reason: ${user.banReason ?? "Policy violation"}`, 403);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return err("Invalid email or password", 401);

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  const character = await Character.findOne({ userId: user._id }).select("name level currentLocation");

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
  const cookie = createSessionCookie(token);

  const response = ok({
    message: "Login successful",
    user: { id: user._id, username: user.username, email: user.email, role: user.role },
    hasCharacter: !!character,
    character: character
      ? { name: character.name, level: character.level, location: character.currentLocation }
      : null,
  });
  response.headers.set("Set-Cookie", cookie);
  return response;
}
