import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITeamApplication {
  characterId: Types.ObjectId;
  message: string;
  appliedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  leaderId: Types.ObjectId;
  members: Types.ObjectId[];
  applications: ITeamApplication[];
  activity: string;
  maxSize: number;
  isOpen: boolean;
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true, maxlength: 30 },
    leaderId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "Character" }],
    applications: [
      {
        characterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
        message: { type: String, default: "", maxlength: 300 },
        appliedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    activity: { type: String, default: "exploring" },
    maxSize: { type: Number, default: 4, min: 2, max: 6 },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Team: Model<ITeam> = mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);
export default Team;
