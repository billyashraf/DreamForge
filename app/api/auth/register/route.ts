import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { signToken, createSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/response";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
    return err("Too many registration attempts. Please wait 15 minutes.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON");

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0].message);
  }

  const { username, email, password } = parsed.data;

  await connectDB();

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    if (existingUser.email === email) return err("Email already registered");
    return err("Username already taken");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ username, email, passwordHash });

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
  const cookie = createSessionCookie(token);

  const response = ok({ message: "Account created successfully", userId: user._id }, 201);
  response.headers.set("Set-Cookie", cookie);
  return response;
}
