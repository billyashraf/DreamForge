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
