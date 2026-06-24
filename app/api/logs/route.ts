import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import ActivityLog from "@/models/ActivityLog";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId }).select("_id");
  if (!character) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find({ characterId: character._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments({ characterId: character._id }),
  ]);

  return ok({ logs, total, page, pages: Math.ceil(total / limit) });
}
