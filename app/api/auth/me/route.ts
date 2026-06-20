import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import { applyEnergyRegen, applyHealthRegen, applyMadnessRegen, applyPoisonDamage } from "@/lib/energy";
import User from "@/models/User";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const user = await User.findById(session.userId).select("-passwordHash");
  if (!user) return unauthorized();

  const character = await Character.findOne({ userId: user._id }).select(
    "name level experience health maxHealth energy maxEnergy credits strength intelligence agility skills currentLocation guildId guildIds owlReturnAt teamId lastEnergyRegen lastHealthRegen shadowForm merits pain maxPain madness lastPainUpdate lastMadnessUpdate isDead poisonedUntil lastPoisonTick"
  );

  if (character) {
    // Migrate single guildId → guildIds array (one-time, transparent)
    if (character.guildId && character.guildIds.length === 0) {
      character.guildIds = [character.guildId];
    }
    applyMadnessRegen(character);
    applyPoisonDamage(character);
    await applyEnergyRegen(character);
    await applyHealthRegen(character);
    await character.save();
  }

  return ok({
    user: { id: user._id, username: user.username, email: user.email, role: user.role },
    character: character
      ? { id: character._id.toString(), ...character.toObject() }
      : null,
  });
}
