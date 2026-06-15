import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { teamCreateSchema } from "@/lib/validations";
import { ok, err, unauthorized } from "@/lib/response";
import Team from "@/models/Team";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  const teams = await Team.find({ isOpen: true })
    .populate("leaderId", "name level currentLocation")
    .limit(20);

  return ok({ teams });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON");

  const parsed = teamCreateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  if (character.teamId) return err("You are already in a team. Leave first.");

  const team = await Team.create({
    name: parsed.data.name,
    leaderId: character._id,
    members: [character._id],
    maxSize: parsed.data.maxSize ?? 4,
    activity: parsed.data.activity ?? "exploring",
  });

  character.teamId = team._id as never;
  await character.save();

  return ok({ message: `Team "${team.name}" created!`, team }, 201);
}
