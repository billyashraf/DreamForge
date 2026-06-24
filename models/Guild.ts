import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type GuildRank = "queen" | "rook" | "bishop" | "knight" | "pawn";

export type GuildPosition =
  | "king" | "queen" | "rook" | "bishop" | "knight" | "pawn"
  | "saber" | "lancer" | "rider" | "caster" | "berserker" | "archer" | "assassin"
  | "demon";

export interface IMemberRank {
  memberId: Types.ObjectId;
  rank: GuildRank;
}

export interface IMemberPosition {
  memberId: Types.ObjectId;
  positions: GuildPosition[];
}

export interface IGuildApplication {
  characterId: Types.ObjectId;
  message: string;
  appliedAt: Date;
}

export interface IGuild extends Document {
  name: string;
  tag: string;
  leaderId: Types.ObjectId;
  officers: Types.ObjectId[];
  members: Types.ObjectId[];
  memberRanks: IMemberRank[];
  memberPositions: IMemberPosition[];
  applications: IGuildApplication[];
  description: string;
  level: number;
  credits: number;
  marsRating: number;
  isSuspended: boolean;
  createdAt: Date;
}

const POSITION_ENUM = [
  "king","queen","rook","bishop","knight","pawn",
  "saber","lancer","rider","caster","berserker","archer","assassin","demon",
];

const GuildSchema = new Schema<IGuild>(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    tag: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 2, maxlength: 5 },
    leaderId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
    officers: [{ type: Schema.Types.ObjectId, ref: "Character" }],
    members: [{ type: Schema.Types.ObjectId, ref: "Character" }],
    memberRanks: [
      {
        memberId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
        rank: { type: String, enum: ["queen", "rook", "bishop", "knight", "pawn"], default: "pawn" },
        _id: false,
      },
    ],
    memberPositions: [
      {
        memberId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
        positions: [{ type: String, enum: POSITION_ENUM }],
        _id: false,
      },
    ],
    applications: [
      {
        characterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
        message: { type: String, default: "", maxlength: 300 },
        appliedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    description: { type: String, default: "", maxlength: 500 },
    level: { type: Number, default: 1 },
    credits: { type: Number, default: 0 },
    marsRating: { type: Number, default: 0 },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Guild: Model<IGuild> = mongoose.models.Guild || mongoose.model<IGuild>("Guild", GuildSchema);
export default Guild;
