import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IGuildApplication extends Document {
  characterId: Types.ObjectId;
  characterName: string;
  guildId: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const GuildApplicationSchema = new Schema<IGuildApplication>(
  {
    characterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
    characterName: { type: String, required: true },
    guildId: { type: Schema.Types.ObjectId, ref: "Guild", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

GuildApplicationSchema.index({ guildId: 1, status: 1 });
GuildApplicationSchema.index({ characterId: 1, guildId: 1 });

const GuildApplication: Model<IGuildApplication> =
  mongoose.models.GuildApplication ||
  mongoose.model<IGuildApplication>("GuildApplication", GuildApplicationSchema);

export default GuildApplication;
