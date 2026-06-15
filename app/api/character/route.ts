import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { characterCreateSchema } from "@/lib/validations";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";
import User from "@/models/User";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId })
    .populate("guildId", "name tag")
    .populate("teamId", "name activity");

  if (!character) return err("No character found. Please create one.", 404);

  return ok(character);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const existing = await Character.findOne({ userId: session.userId });
  if (existing) return err("You already have a character");

  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON");

  const parsed = characterCreateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { name } = parsed.data;

  const nameTaken = await Character.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (nameTaken) return err("Character name already taken");

  const user = await User.findById(session.userId);
  if (!user) return unauthorized();

  const character = await Character.create({
    userId: session.userId,
    name,
    currentLocation: "metapolis",
  });

  return ok({ message: `Welcome to Metapolis, ${name}!`, character }, 201);
}
