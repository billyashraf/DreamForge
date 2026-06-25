import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { ok, err } from "@/lib/response";
import User from "@/models/User";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-cleanup-secret");
  if (!secret || secret !== process.env.CLEANUP_SECRET) {
    return err("Unauthorized", 401);
  }

  await connectDB();

  const cutoff = new Date(Date.now() - FIVE_DAYS_MS);
  const result = await User.deleteMany({
    isVerified: false,
    googleId: { $exists: false },
    createdAt: { $lt: cutoff },
  });

  return ok({ deleted: result.deletedCount });
}
