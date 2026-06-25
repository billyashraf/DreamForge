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

  try {
    await connectDB();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login] connectDB failed:", msg);
    return err(`Database unavailable: ${msg}`, 503);
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return err("Invalid email or password", 401);

    if (user.isBanned) {
      return err(`Account suspended. Reason: ${user.banReason ?? "Policy violation"}`, 403);
    }

    // Unverified accounts can still log in — they see the UNVERIFIED badge in navbar

    if (!user.passwordHash) {
      return err("This account was created with Google sign-in. Use the 'Sign in with Google' button.", 400);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return err("Invalid email or password", 401);

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const character = await Character.findOne({ userId: user._id }).select(
      "name level experience health maxHealth energy maxEnergy credits strength intelligence agility skills currentLocation guildId teamId lastEnergyRegen shadowForm merits pain maxPain madness lastPainUpdate"
    );

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const cookie = createSessionCookie(token);

    const response = ok({
      message: "Login successful",
      user: { id: user._id, username: user.username, email: user.email, role: user.role, emailVerified: user.isVerified },
      hasCharacter: !!character,
      character: character
        ? { id: character._id.toString(), ...character.toObject() }
        : null,
    });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login] error:", msg);
    return err(`Server error: ${msg}`, 500);
  }
}
