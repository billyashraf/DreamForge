import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken, createSessionCookie } from "@/lib/auth";
import User from "@/models/User";
import Character from "@/models/Character";

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  verified_email: boolean;
}

function sanitizeUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_{2,}/g, "_").slice(0, 16);
  return cleaned.length >= 3 ? cleaned : cleaned.padEnd(3, "0");
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (await User.findOne({ username: candidate })) {
    attempt++;
    candidate = `${base.slice(0, 15)}_${attempt}`;
  }
  return candidate;
}

function redirectError(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const { searchParams } = req.nextUrl;

  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return redirectError(origin, "google_cancelled");
  if (!code || !state) return redirectError(origin, "google_invalid");

  // Verify CSRF state
  const storedState = req.cookies.get("oauth_state")?.value;
  if (!storedState || storedState !== state) return redirectError(origin, "google_state");

  const redirectUri = new URL("/api/auth/google/callback", origin).toString();

  // Exchange auth code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) return redirectError(origin, "google_token");

  const { access_token } = await tokenRes.json() as { access_token: string };

  // Fetch Google user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) return redirectError(origin, "google_userinfo");

  const gUser = await userRes.json() as GoogleUser;

  if (!gUser.email) return redirectError(origin, "google_no_email");

  await connectDB();

  // Find existing account by googleId or email
  let user = await User.findOne({ $or: [{ googleId: gUser.id }, { email: gUser.email.toLowerCase() }] });

  if (user) {
    if (user.isBanned) return redirectError(origin, "banned");
    // Link Google ID if not already set (email-matched account)
    if (!user.googleId) {
      await User.findByIdAndUpdate(user._id, { $set: { googleId: gUser.id, isVerified: true } });
    }
    await User.findByIdAndUpdate(user._id, { $set: { lastLogin: new Date() } });
  } else {
    // New user — derive a username from their Google display name
    const base = sanitizeUsername(gUser.name || gUser.email.split("@")[0]);
    const username = await uniqueUsername(base);

    user = await User.create({
      username,
      email: gUser.email.toLowerCase(),
      passwordHash: "",
      googleId: gUser.id,
      role: "player",
      isVerified: true,
    });
  }

  const hasCharacter = !!(await Character.findOne({ userId: user._id }).select("_id").lean());
  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  const dest = user.role !== "player"
    ? "/admin"
    : hasCharacter ? "/dashboard" : "/character/create";

  const response = NextResponse.redirect(new URL(dest, origin));
  // Set session cookie and clear CSRF state cookie
  response.headers.append("Set-Cookie", createSessionCookie(token));
  response.headers.append("Set-Cookie", "oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");

  return response;
}
