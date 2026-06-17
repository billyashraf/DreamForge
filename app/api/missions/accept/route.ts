import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { applyEnergyRegen, MISSION_ENERGY_COST } from "@/lib/energy";
import Mission from "@/models/Mission";
import Character from "@/models/Character";

const XP_TO_LEVEL: Record<number, number> = {};
for (let i = 1; i <= 100; i++) {
  XP_TO_LEVEL[i] = Math.floor(100 * Math.pow(i, 1.5));
}

function applyLevelUps(character: InstanceType<typeof Character>): number {
  let gained = 0;
  while (character.level < 100) {
    const required = XP_TO_LEVEL[character.level] ?? Infinity;
    if (character.experience < required) break;
    character.level += 1;
    character.maxHealth += 10;
    character.health = character.maxHealth;
    character.maxEnergy += 5;
    character.energy = character.maxEnergy;
    gained++;
  }
  return gained;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.missionId) return err("missionId is required");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  await applyEnergyRegen(character);

  const mission = await Mission.findById(body.missionId);
  if (!mission || !mission.isActive) return err("Mission not found or inactive", 404);

  if (mission.location !== character.currentLocation) {
    return err(`You must be in ${mission.location.replace(/_/g, " ")} to run this mission`);
  }

  if (mission.requirements?.level && character.level < mission.requirements.level) {
    return err(`Requires level ${mission.requirements.level}`);
  }

  const energyCost = MISSION_ENERGY_COST[mission.difficulty] ?? 10;
  if (character.energy < energyCost) {
    const minutesNeeded = Math.ceil((energyCost - character.energy) / 2);
    return err(`Not enough energy. Need ${energyCost} EN. Regenerates in ~${minutesNeeded} min.`);
  }

  character.energy -= energyCost;
  character.experience += mission.rewards.experience;
  character.credits += mission.rewards.credits;
  character.merits = (character.merits ?? 0) + (mission.rewards.merits ?? 0);

  const levelsGained = applyLevelUps(character);
  character.lastEnergyRegen = new Date();
  await character.save();

  return ok({
    message: `Mission complete: ${mission.title}`,
    narrative: mission.narrative || `You completed: ${mission.description}`,
    rewards: { experience: mission.rewards.experience, credits: mission.rewards.credits, merits: mission.rewards.merits ?? 0 },
    levelsGained,
    newLevel: levelsGained > 0 ? character.level : null,
    character: {
      level: character.level,
      experience: character.experience,
      credits: character.credits,
      merits: character.merits,
      health: character.health,
      maxHealth: character.maxHealth,
      energy: character.energy,
      maxEnergy: character.maxEnergy,
      lastEnergyRegen: character.lastEnergyRegen,
    },
  });
}
