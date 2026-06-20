import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { applyEnergyRegen, applyMadnessRegen, applyPainRegen, applyPoisonDamage, MISSION_ENERGY_COST } from "@/lib/energy";
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

// [min, max] HP lost on a failed mission
const HP_LOSS: Record<string, [number, number]> = {
  easy:      [5,  15],
  medium:    [15, 35],
  hard:      [30, 60],
  legendary: [50, 90],
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

const DEATH_NARRATIVES: Record<string, string[]> = {
  easy: [
    "A simple mistake turned fatal. The world goes dark.",
    "Overconfidence. The last thing you see is the ground rushing up.",
  ],
  medium: [
    "The ambush was more coordinated than expected. Your body gives out.",
    "Too many wounds. You slip from consciousness.",
  ],
  hard: [
    "The mission broke you. You collapse in the dust.",
    "Darkness takes you. You fought well — but not well enough.",
  ],
  legendary: [
    "The legend ends here. For now.",
    "Even the strongest fall. You are no exception.",
  ],
};

function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function applyLevelUps(character: InstanceType<typeof Character>): number {
  let gained = 0;
  while (gained < 500) {
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

function charSnapshot(character: InstanceType<typeof Character>) {
  return {
    level:           character.level,
    experience:      character.experience,
    credits:         character.credits,
    merits:          character.merits,
    health:          character.health,
    maxHealth:       character.maxHealth,
    energy:          character.energy,
    maxEnergy:       character.maxEnergy,
    pain:            character.pain,
    maxPain:         character.maxPain,
    madness:         character.madness,
    isDead:          character.isDead,
    poisonedUntil:   character.poisonedUntil,
    lastPoisonTick:  character.lastPoisonTick,
    lastPainUpdate:  character.lastPainUpdate,
    lastEnergyRegen: character.lastEnergyRegen,
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.missionId) return err("missionId is required");

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  // Pre-existing dead state (no poison damage this call)
  if (character.isDead) return err("You cannot run missions while dead. Respawn first.");

  applyMadnessRegen(character);
  const poisonDamage = applyPoisonDamage(character);
  await applyEnergyRegen(character);

  // Poison may have killed the character — surface it as a death response
  if (character.isDead && poisonDamage > 0) {
    await character.save();
    return ok({
      failed:        true,
      died:          true,
      hpLost:        poisonDamage,
      painGained:    0,
      madnessGained: 0,
      message:       `${character.name} succumbed to poison.`,
      narrative:     "The toxin finally won. Darkness takes you before the mission could begin.",
      character:     charSnapshot(character),
    });
  }

  if (character.isDead) return err("You cannot run missions while dead. Respawn first.");

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

  character.energy -= energyCost;
  character.lastEnergyRegen = new Date();

  // ── Roll for failure ──────────────────────────────────────────────────────
  const failChance = FAIL_CHANCE[mission.difficulty] ?? 0.15;
  const failed     = Math.random() < failChance;

  if (failed) {
    applyPainRegen(character);

    // Pain
    const painGained = PAIN_GAIN[mission.difficulty] ?? 15;
    const maxPain    = character.maxPain ?? 100;
    character.pain   = (character.pain ?? 0) + painGained;
    character.lastPainUpdate = new Date();

    let madnessGained = 0;
    while (character.pain >= maxPain) {
      character.pain    -= maxPain;
      character.madness  = (character.madness ?? 0) + 1;
      madnessGained++;
    }

    // HP loss
    const [minLoss, maxLoss] = HP_LOSS[mission.difficulty] ?? [10, 20];
    const hpLost = minLoss + Math.floor(Math.random() * (maxLoss - minLoss + 1));
    character.health = Math.max(0, character.health - hpLost);

    const died = character.health <= 0;
    if (died) character.isDead = true;

    await character.save();

    const pool    = died ? DEATH_NARRATIVES : FAIL_NARRATIVES;
    const options = (pool[mission.difficulty] ?? pool.easy);
    const narrative = options[Math.floor(Math.random() * options.length)];

    return ok({
      message:       died ? `${character.name} has fallen.` : `Mission failed: ${mission.title}`,
      narrative,
      failed:        true,
      died,
      hpLost,
      painGained,
      madnessGained,
      character:     charSnapshot(character),
    });
  }

  // ── Success ───────────────────────────────────────────────────────────────
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
    died:      false,
    rewards:   {
      experience: mission.rewards.experience,
      credits:    mission.rewards.credits,
      merits:     mission.rewards.merits ?? 0,
    },
    levelsGained,
    newLevel:  levelsGained > 0 ? character.level : null,
    character: charSnapshot(character),
  });
}
