import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Mission from "@/models/Mission";
import Character from "@/models/Character";

const XP_TO_LEVEL: Record<number, number> = {};
for (let i = 1; i <= 100; i++) {
  XP_TO_LEVEL[i] = Math.floor(100 * Math.pow(i, 1.5));
}

function checkLevelUp(character: InstanceType<typeof Character>): boolean {
  const required = XP_TO_LEVEL[character.level] ?? Infinity;
  if (character.experience >= required && character.level < 100) {
    character.level += 1;
    character.maxHealth += 10;
    character.health = character.maxHealth;
    character.maxEnergy += 5;
    character.energy = character.maxEnergy;
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.missionId) return err("missionId is required");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  const mission = await Mission.findById(body.missionId);
  if (!mission || !mission.isActive) return err("Mission not found or inactive", 404);

  if (mission.location !== character.currentLocation) {
    return err(`You must be in ${mission.location.replace("_", " ")} to accept this mission`);
  }

  if (character.activeMissions.length >= 3) {
    return err("You can only have 3 active missions at a time");
  }

  const alreadyActive = character.activeMissions.some((id) => id.toString() === body.missionId);
  if (alreadyActive) return err("You already have this mission active");

  const alreadyDone = character.completedMissions.some((id) => id.toString() === body.missionId);
  if (alreadyDone) return err("You already completed this mission");

  if (mission.requirements?.level && character.level < mission.requirements.level) {
    return err(`Requires level ${mission.requirements.level}`);
  }

  if (character.energy < 10) return err("Not enough energy to start a mission");

  character.energy -= 10;
  character.activeMissions.push(mission._id as never);
  character.experience += mission.rewards.experience;
  character.credits += mission.rewards.credits;
  character.activeMissions = character.activeMissions.filter(
    (id) => id.toString() !== mission._id.toString()
  ) as never;
  character.completedMissions.push(mission._id as never);

  const leveledUp = checkLevelUp(character);
  await character.save();

  return ok({
    message: `Mission complete: ${mission.title}`,
    narrative: mission.narrative || `You successfully completed: ${mission.description}`,
    rewards: {
      experience: mission.rewards.experience,
      credits: mission.rewards.credits,
    },
    leveledUp,
    newLevel: leveledUp ? character.level : null,
    character: {
      level: character.level,
      experience: character.experience,
      credits: character.credits,
      health: character.health,
      energy: character.energy,
    },
  });
}
