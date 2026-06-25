import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { ok, err } from "@/lib/response";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email) return err("Email is required");

  await connectDB();

  const user = await User.findOne({ email: body.email.toLowerCase().trim() });

  // Always return ok — don't leak whether email exists
  if (user && user.passwordHash) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (e) {
      console.error("[forgot-password] email send failed:", e);
    }
  }

  return ok({ message: "If that email is registered, a password reset link has been sent." });
}
