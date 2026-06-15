import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IGuild extends Document {
  name: string;
  tag: string;
  leaderId: Types.ObjectId;
  officers: Types.ObjectId[];
  members: Types.ObjectId[];
  description: string;
  level: number;
  credits: number;
  marsRating: number;
  createdAt: Date;
}

const GuildSchema = new Schema<IGuild>(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    tag: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 2, maxlength: 5 },
    leaderId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
    officers: [{ type: Schema.Types.ObjectId, ref: "Character" }],
    members: [{ type: Schema.Types.ObjectId, ref: "Character" }],
    description: { type: String, default: "", maxlength: 500 },
    level: { type: Number, default: 1 },
    credits: { type: Number, default: 0 },
    marsRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Guild: Model<IGuild> = mongoose.models.Guild || mongoose.model<IGuild>("Guild", GuildSchema);
export default Guild;
