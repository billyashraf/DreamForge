import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Mission from "@/models/Mission";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missions = await Mission.find({
    isActive: true,
    location: character.currentLocation,
    "requirements.level": { $lte: character.level },
  } as Record<string, unknown>).sort({ difficulty: 1 });

  return ok({ missions, location: character.currentLocation });
}
