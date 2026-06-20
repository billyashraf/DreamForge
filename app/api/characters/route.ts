import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import Character from "@/models/Character";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  await connectDB();

  const filter = q.length >= 2 ? { name: { $regex: q, $options: "i" } } : {};

  const characters = await Character.find(filter)
    .select("name level shadowForm currentLocation")
    .limit(15)
    .lean();

  return ok({ characters });
}
