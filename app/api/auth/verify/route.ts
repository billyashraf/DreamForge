import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken, createSessionCookie } from "@/lib/auth";
import User from "@/models/User";
import Character from "@/models/Character";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=verify_missing", origin));
  }

  await connectDB();

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=verify_invalid", origin));
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save();

  const hasCharacter = !!(await Character.findOne({ userId: user._id }).select("_id").lean());
  const jwtToken = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  const dest = user.role !== "player" ? "/admin" : hasCharacter ? "/dashboard" : "/character/create";
  const response = NextResponse.redirect(new URL(dest, origin));
  response.headers.set("Set-Cookie", createSessionCookie(jwtToken));
  return response;
}
