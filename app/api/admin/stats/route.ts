import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized, forbidden } from "@/lib/response";
import User from "@/models/User";
import Character from "@/models/Character";
import Mission from "@/models/Mission";
import Guild from "@/models/Guild";
import Team from "@/models/Team";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "admin" && session.role !== "moderator") return forbidden();

  await connectDB();

  const [totalUsers, totalCharacters, totalMissions, totalGuilds, totalTeams, bannedUsers, onlineLast24h] =
    await Promise.all([
      User.countDocuments(),
      Character.countDocuments(),
      Mission.countDocuments({ isActive: true }),
      Guild.countDocuments(),
      Team.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

  return ok({
    totalUsers,
    totalCharacters,
    totalMissions,
    totalGuilds,
    totalTeams,
    bannedUsers,
    onlineLast24h,
  });
}
