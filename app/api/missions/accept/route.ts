import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { applyEnergyRegen, applyPainRegen, MISSION_ENERGY_COST } from "@/lib/energy";
import Mission from "@/models/Mission";
import Character from "@/models/Character";

const FAIL_CHANCE: Record<string, number> = {
  easy:      0.10,
  medium:    0.25,
  hard:      0.40,
  legendary: 0.60,
};

const PAIN_GAIN: Record<string, number> = {
  easy:      10,
  medium:    25,
  hard:      40,
  legendary: 60,
};

const FAIL_NARRATIVES: Record<string, string[]> = {
  easy: [
    "Something went wrong — a rookie mistake. You limp back empty-handed.",
    "The mission slipped through your fingers. Small wounds, bruised pride.",
  ],
  medium: [
    "You were close. An ambush caught you off guard and forced a retreat.",
    "The odds turned against you. You barely made it out.",
  ],
  hard: [
    "The mission was too much this time. You retreat battered and broken.",
    "Outmatched and overwhelmed, you pull back before it gets worse.",
  ],
  legendary: [
    "The forces arrayed against you were beyond calculation. You survive — barely.",
    "Defeat. The kind that leaves scars. You crawl back to safety.",
  ],
};

// XP required to reach the next level — infinite, no cap
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function applyLevelUps(character: InstanceType<typeof Character>): number {
  let gained = 0;
  while (gained < 500) { // safety limit — no practical cap on level
    const required = xpForLevel(character.level);
    if (character.experience < required) break;
    character.experience -= required;
    character.level     += 1;
    character.maxHealth += 10;
    character.health     = character.maxHealth;
    character.maxEnergy += 5;
    character.energy     = character.maxEnergy;
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

  if (mission.location !== character.currentLocation)
    return err(`You must be in ${mission.location.replace(/_/g, " ")} to run this mission`);

  if (mission.requirements?.level && character.level < mission.requirements.level)
    return err(`Requires level ${mission.requirements.level}`);

  const energyCost = MISSION_ENERGY_COST[mission.difficulty] ?? 10;
  if (character.energy < energyCost) {
    const minutesNeeded = Math.ceil((energyCost - character.energy) / 2);
    return err(`Not enough energy. Need ${energyCost} EN. Regenerates in ~${minutesNeeded} min.`);
  }

  // Deduct energy regardless of outcome
  character.energy -= energyCost;
  character.lastEnergyRegen = new Date();

  // ── Roll for failure ──────────────────────────────────────────────────────
  const failChance = FAIL_CHANCE[mission.difficulty] ?? 0.15;
  const failed     = Math.random() < failChance;

  if (failed) {
    // Apply pain regen first, then add new pain
    applyPainRegen(character);

    const painGained = PAIN_GAIN[mission.difficulty] ?? 15;
    const maxPain    = character.maxPain ?? 100;
    character.pain   = (character.pain ?? 0) + painGained;
    character.lastPainUpdate = new Date();

    // Overflow: each time pain hits max, gain 1 madness and wrap around
    let madnessGained = 0;
    while (character.pain >= maxPain) {
      character.pain    -= maxPain;
      character.madness  = (character.madness ?? 0) + 1;
      madnessGained++;
    }

    await character.save();

    const narratives = FAIL_NARRATIVES[mission.difficulty] ?? FAIL_NARRATIVES.easy;
    const narrative  = narratives[Math.floor(Math.random() * narratives.length)];

    return ok({
      message:       `Mission failed: ${mission.title}`,
      narrative,
      failed:        true,
      painGained,
      madnessGained,
      character: {
        level:          character.level,
        experience:     character.experience,
        credits:        character.credits,
        merits:         character.merits,
        health:         character.health,
        maxHealth:      character.maxHealth,
        energy:         character.energy,
        maxEnergy:      character.maxEnergy,
        pain:           character.pain,
        maxPain:        character.maxPain,
        madness:        character.madness,
        lastPainUpdate: character.lastPainUpdate,
        lastEnergyRegen: character.lastEnergyRegen,
      },
    });
  }

  // ── Success ───────────────────────────────────────────────────────────────
  // Pain recedes on success too (time passed)
  applyPainRegen(character);

  character.experience += mission.rewards.experience;
  character.credits    += mission.rewards.credits;
  character.merits      = (character.merits ?? 0) + (mission.rewards.merits ?? 0);

  const levelsGained = applyLevelUps(character);
  await character.save();

  return ok({
    message:   `Mission complete: ${mission.title}`,
    narrative: mission.narrative || `You completed: ${mission.description}`,
    failed:    false,
    rewards:   {
      experience: mission.rewards.experience,
      credits:    mission.rewards.credits,
      merits:     mission.rewards.merits ?? 0,
    },
    levelsGained,
    newLevel: levelsGained > 0 ? character.level : null,
    character: {
      level:          character.level,
      experience:     character.experience,
      credits:        character.credits,
      merits:         character.merits,
      health:         character.health,
      maxHealth:      character.maxHealth,
      energy:         character.energy,
      maxEnergy:      character.maxEnergy,
      pain:           character.pain,
      maxPain:        character.maxPain,
      madness:        character.madness,
      lastPainUpdate: character.lastPainUpdate,
      lastEnergyRegen: character.lastEnergyRegen,
    },
  });
}
