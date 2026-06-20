import type { ICharacter } from "@/models/Character";

export const ENERGY_REGEN_RATE = 2; // energy per minute — full regen takes 50-150 min depending on maxEnergy

export const MISSION_ENERGY_COST: Record<string, number> = {
  easy: 5,
  medium: 10,
  hard: 15,
  legendary: 25,
};

export async function applyEnergyRegen(character: ICharacter): Promise<void> {
  const now = new Date();
  const last = (character.lastEnergyRegen ?? character.createdAt ?? now) as Date;
  const minutesElapsed = (now.getTime() - last.getTime()) / 60000;
  const gained = Math.floor(minutesElapsed * ENERGY_REGEN_RATE);

  if (gained === 0) return;

  character.energy = Math.min(character.energy + gained, character.maxEnergy);
  character.lastEnergyRegen = now;
  await character.save();
}

// Poison drains -15 HP per minute while active. Returns total HP damage dealt.
export function applyPoisonDamage(character: ICharacter): number {
  if (!character.poisonedUntil || character.isDead) return 0;

  const now = new Date();
  // Cap effective "now" at expiry so we never apply damage beyond the 4-hour window
  const effectiveNow = now < character.poisonedUntil ? now : character.poisonedUntil;
  const last = (character.lastPoisonTick ?? character.createdAt ?? now) as Date;
  const minutesElapsed = (effectiveNow.getTime() - last.getTime()) / 60_000;
  const ticks = Math.floor(minutesElapsed);

  if (ticks <= 0) return 0;

  const damage = ticks * 15;
  character.health = Math.max(0, character.health - damage);
  character.lastPoisonTick = new Date(last.getTime() + ticks * 60_000);

  if (character.health <= 0) character.isDead = true;

  return damage;
}

// Madness decreases by 1 per day, minimum 0
export function applyMadnessRegen(character: ICharacter): void {
  if (!character.madness || character.madness <= 0) return;
  const now = new Date();
  const last = (character.lastMadnessUpdate ?? character.createdAt ?? now) as Date;
  const daysElapsed = (now.getTime() - last.getTime()) / 86_400_000;
  const reduction = Math.floor(daysElapsed);
  if (reduction <= 0) return;
  character.madness = Math.max(0, character.madness - reduction);
  // Advance by exactly `reduction` days so sub-day remainder is preserved
  character.lastMadnessUpdate = new Date(last.getTime() + reduction * 86_400_000);
}

// Pain recedes to 0 over 45 minutes — called before any pain calculation
export function applyPainRegen(character: ICharacter): void {
  const now = new Date();
  const last = character.lastPainUpdate ?? now;
  const minutesElapsed = (now.getTime() - last.getTime()) / 60000;
  const maxPain = character.maxPain ?? 100;
  const reduction = minutesElapsed * (maxPain / 45);
  character.pain = Math.max(0, (character.pain ?? 0) - reduction);
  character.lastPainUpdate = now;
}
