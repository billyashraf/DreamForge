import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { ok, err } from "@/lib/response";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`resend:${ip}`, 5, 15 * 60 * 1000)) {
    return err("Too many resend attempts. Please wait 15 minutes.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body?.email) return err("email is required");

  await connectDB();

  const user = await User.findOne({ email: body.email.toLowerCase().trim() });
  if (!user) return ok({ message: "If that email is registered, a verification link has been sent." });
  if (user.isVerified) return ok({ message: "Account already verified. You can log in." });

  const token = randomBytes(32).toString("hex");
  user.verificationToken = token;
  user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60_000);
  await user.save();

  const baseUrl = req.nextUrl.origin;
  const { devUrl } = await sendVerificationEmail(user.email, user.username, token, baseUrl);

  return ok({ message: "Verification email sent.", devUrl });
}
