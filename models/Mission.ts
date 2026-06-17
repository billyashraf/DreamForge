import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMission extends Document {
  title: string;
  location: "metapolis" | "moon_junkyard" | "earth" | "mars";
  description: string;
  narrative: string;
  difficulty: "easy" | "medium" | "hard" | "legendary";
  type: "solo" | "team" | "guild";
  rewards: {
    experience: number;
    credits: number;
    merits: number;
    items?: string[];
  };
  requirements: {
    level?: number;
    strength?: number;
    intelligence?: number;
    agility?: number;
    teamSize?: number;
  };
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
}

const MissionSchema = new Schema<IMission>(
  {
    title: { type: String, required: true, trim: true },
    location: {
      type: String,
      enum: ["metapolis", "moon_junkyard", "earth", "mars"],
      required: true,
    },
    description: { type: String, required: true },
    narrative: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "legendary"], default: "easy" },
    type: { type: String, enum: ["solo", "team", "guild"], default: "solo" },
    rewards: {
      experience: { type: Number, default: 50 },
      credits: { type: Number, default: 100 },
      merits: { type: Number, default: 0 },
      items: [{ type: String }],
    },
    requirements: {
      level: { type: Number, default: 1 },
      strength: { type: Number },
      intelligence: { type: Number },
      agility: { type: Number },
      teamSize: { type: Number },
    },
    durationMinutes: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Mission: Model<IMission> =
  mongoose.models.Mission || mongoose.model<IMission>("Mission", MissionSchema);
export default Mission;
