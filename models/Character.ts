import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICurseNode {
  skillId: string;
  level: number;
}

export interface ICurseLink {
  from: string;
  to: string;
  weight: number;
}

export interface IAcademyNode {
  fieldId: string;
  level: number;
}

export interface ICharacter extends Document {
  userId: Types.ObjectId;
  name: string;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  credits: number;
  strength: number;
  intelligence: number;
  agility: number;
  skills: {
    combat: number;
    scavenging: number;
    survival: number;
    strategy: number;
    crafting: number;
  };
  currentLocation: string;
  inventory: { itemId: Types.ObjectId; quantity: number }[];
  itemCooldowns: { itemKey: string; expiresAt: Date }[];
  guildId?: Types.ObjectId;
  guildIds: Types.ObjectId[];
  owlReturnAt?: Date;
  lastTeamMessage?: Date;
  lastGuildMessage?: Date;
  teamId?: Types.ObjectId;
  activeMissions: Types.ObjectId[];
  completedMissions: Types.ObjectId[];
  lastEnergyRegen?: Date;
  lastHealthRegen?: Date;
  pain: number;
  maxPain: number;
  madness: number;
  lastPainUpdate?: Date;
  lastMadnessUpdate?: Date;
  poisonedUntil?: Date;
  lastPoisonTick?: Date;
  merits: number;
  isDead: boolean;
  shadowForm: string | null;
  curseTree: ICurseNode[];
  curseLinks: ICurseLink[];
  academyTree: IAcademyNode[];
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<ICharacter>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 20 },
    level: { type: Number, default: 1, min: 1 },
    experience: { type: Number, default: 0, min: 0 },
    health: { type: Number, default: 100 },
    maxHealth: { type: Number, default: 100 },
    energy: { type: Number, default: 100 },
    maxEnergy: { type: Number, default: 100 },
    credits: { type: Number, default: 500 },
    strength: { type: Number, default: 5 },
    intelligence: { type: Number, default: 5 },
    agility: { type: Number, default: 5 },
    skills: {
      combat: { type: Number, default: 1 },
      scavenging: { type: Number, default: 1 },
      survival: { type: Number, default: 1 },
      strategy: { type: Number, default: 1 },
      crafting: { type: Number, default: 1 },
    },
    currentLocation: { type: String, default: "metapolis" },
    inventory: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
        quantity: { type: Number, default: 1, min: 0 },
        _id: false,
      },
    ],
    itemCooldowns: [
      {
        itemKey: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        _id: false,
      },
    ],
    guildId: { type: Schema.Types.ObjectId, ref: "Guild" },
    guildIds: [{ type: Schema.Types.ObjectId, ref: "Guild" }],
    owlReturnAt: { type: Date, default: null },
    lastTeamMessage: { type: Date },
    lastGuildMessage: { type: Date },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    activeMissions: [{ type: Schema.Types.ObjectId, ref: "Mission" }],
    completedMissions: [{ type: Schema.Types.ObjectId, ref: "Mission" }],
    lastEnergyRegen: { type: Date },
    lastHealthRegen: { type: Date },
    pain:          { type: Number, default: 0 },
    maxPain:       { type: Number, default: 100 },
    madness:       { type: Number, default: 0 },
    lastPainUpdate: { type: Date },
    lastMadnessUpdate: { type: Date },
    poisonedUntil: { type: Date },
    lastPoisonTick: { type: Date },
    merits: { type: Number, default: 1000 },
    isDead: { type: Boolean, default: false },
    shadowForm: { type: String, default: null },
    curseTree: [
      {
        skillId: { type: String, required: true },
        level: { type: Number, default: 1, min: 1 },
      },
    ],
    curseLinks: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        weight: { type: Number, default: 1, min: 1 },
      },
    ],
    academyTree: [
      {
        fieldId: { type: String, required: true },
        level: { type: Number, default: 1, min: 1 },
      },
    ],
  },
  { timestamps: true }
);

const Character: Model<ICharacter> =
  mongoose.models.Character || mongoose.model<ICharacter>("Character", CharacterSchema);
export default Character;
