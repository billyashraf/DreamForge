import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import User from "@/models/User";
import Character from "@/models/Character";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "moderator") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  await connectDB();

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;
  const search = url.searchParams.get("search") ?? "";

  const query = search
    ? { $or: [{ username: new RegExp(search, "i") }, { email: new RegExp(search, "i") }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return ok({ users, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.userId) return err("userId is required");

  const { userId, action, reason, role } = body;

  await connectDB();

  const target = await User.findById(userId);
  if (!target) return err("User not found", 404);

  if (role === "admin" && session.role !== "admin") return forbidden();

  switch (action) {
    case "ban":
      target.isBanned = true;
      target.banReason = reason ?? "Policy violation";
      break;
    case "unban":
      target.isBanned = false;
      target.banReason = undefined;
      break;
    case "setRole":
      if (!["player", "moderator", "admin"].includes(role)) return err("Invalid role");
      target.role = role;
      break;
    case "deleteCharacter": {
      await Character.findOneAndDelete({ userId: target._id });
      break;
    }
    default:
      return err("Unknown action");
  }

  await target.save();
  return ok({ message: `Action "${action}" applied to ${target.username}` });
}
