import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItem extends Document {
  name: string;
  itemKey: string;
  type: "weapon" | "armor" | "consumable" | "material" | "tool";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  description: string;
  stats: {
    strength?: number;
    intelligence?: number;
    agility?: number;
    healthBonus?: number;
    energyBonus?: number;
  };
  effect: "pain_reduce" | "energy_add" | "health_add" | null;
  effectValue: number;
  cooldownMinutes: number;
  consumeTimeMinutes: number;
  price: number;
  isAvailable: boolean;
}

const ItemSchema = new Schema<IItem>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    itemKey: { type: String, default: "" },
    type: { type: String, enum: ["weapon", "armor", "consumable", "material", "tool"], required: true },
    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "epic", "legendary"],
      default: "common",
    },
    description: { type: String, default: "" },
    stats: {
      strength: { type: Number, default: 0 },
      intelligence: { type: Number, default: 0 },
      agility: { type: Number, default: 0 },
      healthBonus: { type: Number, default: 0 },
      energyBonus: { type: Number, default: 0 },
    },
    effect: { type: String, enum: ["pain_reduce", "energy_add", "health_add"], default: null },
    effectValue: { type: Number, default: 0 },
    cooldownMinutes: { type: Number, default: 0 },
    consumeTimeMinutes: { type: Number, default: 0 },
    price: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Item: Model<IItem> = mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
export default Item;
