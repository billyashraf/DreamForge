import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { ok, err } from "@/lib/response";
import User from "@/models/User";

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.newPassword) return err("token and newPassword are required");

  const { token, newPassword } = body;

  if (!PASSWORD_RE.test(newPassword)) {
    return err("Password must be at least 8 characters with one uppercase letter and one number");
  }

  await connectDB();

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() },
  });

  if (!user) return err("Reset link is invalid or has expired", 400);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = null;
  user.passwordResetExpiry = null;
  await user.save();

  return ok({ message: "Password updated successfully." });
}
