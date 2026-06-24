import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IActivityLog extends Document {
  characterId: Types.ObjectId;
  type: string;
  message: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    characterId: { type: Schema.Types.ObjectId, ref: "Character", required: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
