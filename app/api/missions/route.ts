import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { applyEnergyRegen, applyMadnessRegen, MISSION_ENERGY_COST, ENERGY_REGEN_RATE } from "@/lib/energy";
import Mission from "@/models/Mission";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  applyMadnessRegen(character);
  await applyEnergyRegen(character);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missions = await Mission.find({
    isActive: true,
    location: character.currentLocation,
    "requirements.level": { $lte: character.level },
  } as Record<string, unknown>).sort({ difficulty: 1 });

  const missionData = missions.map((m) => ({
    ...m.toObject(),
    energyCost: MISSION_ENERGY_COST[m.difficulty] ?? 10,
  }));

  return ok({
    missions: missionData,
    location: character.currentLocation,
    energy: character.energy,
    maxEnergy: character.maxEnergy,
    lastEnergyRegen: character.lastEnergyRegen,
    energyRegenRate: ENERGY_REGEN_RATE,
  });
}
