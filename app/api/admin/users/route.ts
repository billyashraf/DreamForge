import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/response";
import User from "@/models/User";
import Character from "@/models/Character";
import { deleteAccount } from "@/lib/deleteAccount";

async function requireStaff() {
  const session = await getSession();
  if (!session) return { session: null, error: unauthorized() };
  if (session.role !== "admin" && session.role !== "moderator") return { session: null, error: forbidden() };
  return { session, error: null };
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (!session) return error;

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

const ROLE_LEVEL: Record<string, number> = { player: 0, moderator: 1, admin: 2 };

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (!session) return error;

  const body = await req.json().catch(() => null);
  if (!body?.userId) return err("userId is required");

  const { userId, action, reason } = body;

  await connectDB();

  const target = await User.findById(userId);
  if (!target) return err("User not found", 404);

  const actorLevel = ROLE_LEVEL[session.role] ?? 0;
  const targetLevel = ROLE_LEVEL[target.role] ?? 0;

  switch (action) {
    case "ban":
      // Moderators can only ban players; admins can ban anyone below them
      if (actorLevel <= targetLevel) return forbidden();
      target.isBanned = true;
      target.banReason = reason ?? "Policy violation";
      break;

    case "unban":
      if (actorLevel <= targetLevel) return forbidden();
      target.isBanned = false;
      target.banReason = undefined;
      break;

    case "promote_moderator":
      if (session.role !== "admin" && session.role !== "moderator") return forbidden();
      if (target.role !== "player") return err("Can only promote players to moderator");
      target.role = "moderator";
      break;

    case "promote_admin":
      if (session.role !== "admin") return forbidden();
      if (target.role === "admin") return err("Already an admin");
      target.role = "admin";
      break;

    case "demote_player":
      if (session.role !== "admin") return forbidden();
      if (target.role === "player") return err("Already a player");
      if (target.role === "admin") return forbidden();
      target.role = "player";
      break;

    case "demote_moderator":
      if (session.role !== "admin") return forbidden();
      if (target.role !== "admin") return err("Can only demote admins to moderator");
      target.role = "moderator";
      break;

    case "deleteCharacter": {
      if (actorLevel <= targetLevel) return forbidden();
      await Character.findOneAndDelete({ userId: target._id });
      break;
    }

    case "delete_user": {
      // Admin only; cannot delete other admins or yourself
      if (session.role !== "admin") return forbidden();
      if (target.role === "admin") return forbidden();
      if (target._id.toString() === session.userId) return err("Cannot delete your own account here");
      const username = target.username;
      await deleteAccount(target._id.toString());
      return ok({ message: `Account "${username}" permanently deleted` });
    }

    default:
      return err("Unknown action");
  }

  await target.save();
  return ok({ message: `Action "${action}" applied to ${target.username}` });
}
