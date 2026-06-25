import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import User from "@/models/User";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const user = await User.findById(session.userId);
  if (!user) return unauthorized();

  if (user.isVerified) return err("Account is already verified");

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[resend-verification] email send failed:", detail);
    const msg = process.env.NODE_ENV !== "production"
      ? `Email error: ${detail}`
      : "Failed to send verification email. Check your SMTP settings.";
    return err(msg);
  }

  return ok({ message: "Verification email sent." });
}
