import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);
  if (!character.isDead) return err("Character is not dead");

  const xpLost      = Math.floor(character.experience * 0.10);
  const creditsLost = Math.floor(character.credits * 0.10);

  character.isDead          = false;
  character.health          = Math.max(1, Math.floor(character.maxHealth * 0.30));
  character.currentLocation = "metapolis";
  character.experience      = Math.max(0, character.experience - xpLost);
  character.credits         = Math.max(0, character.credits - creditsLost);
  character.pain            = 0;

  await character.save();

  return ok({
    message: "You have respawned in Metapolis.",
    xpLost,
    creditsLost,
    character: {
      isDead:          character.isDead,
      health:          character.health,
      maxHealth:       character.maxHealth,
      energy:          character.energy,
      maxEnergy:       character.maxEnergy,
      credits:         character.credits,
      experience:      character.experience,
      pain:            character.pain,
      currentLocation: character.currentLocation,
    },
  });
}
