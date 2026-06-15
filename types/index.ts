export type UserRole = "player" | "moderator" | "admin";
export type Location = "metapolis" | "moon_junkyard" | "earth" | "mars";
export type Difficulty = "easy" | "medium" | "hard" | "legendary";
export type MissionType = "solo" | "team" | "guild";
export type ItemType = "weapon" | "armor" | "consumable" | "material" | "tool";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
