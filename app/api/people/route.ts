import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 20;

  const query = search
    ? { name: new RegExp(search, "i") }
    : {};

  const [characters, total] = await Promise.all([
    Character.find(query)
      .select("name level shadowForm currentLocation guildIds teamIds")
      .sort({ level: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Character.countDocuments(query),
  ]);

  // Collect all guild/team IDs to batch-fetch names
  const allGuildIds = [...new Set(characters.flatMap((c) => (c.guildIds ?? []).map((g) => g.toString())))];
  const allTeamIds  = [...new Set(characters.flatMap((c) => (c.teamIds  ?? []).map((t) => t.toString())))];

  const [guilds, teams] = await Promise.all([
    allGuildIds.length ? Guild.find({ _id: { $in: allGuildIds } }).select("name tag").lean() : [],
    allTeamIds.length  ? Team.find({ _id: { $in: allTeamIds  } }).select("name").lean()      : [],
  ]);

  const guildMap = new Map(guilds.map((g) => [g._id.toString(), { name: g.name, tag: g.tag }]));
  const teamMap  = new Map(teams.map((t) => [t._id.toString(), { name: t.name }]));

  const result = characters.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    level: c.level,
    shadowForm: c.shadowForm,
    currentLocation: c.currentLocation,
    guilds: (c.guildIds ?? []).map((g) => guildMap.get(g.toString())).filter(Boolean),
    teams:  (c.teamIds  ?? []).map((t) => teamMap.get(t.toString())).filter(Boolean),
  }));

  return ok({ characters: result, total, page, pages: Math.ceil(total / limit) });
}
