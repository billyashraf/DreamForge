import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NotifType =
  | "guild_invite"
  | "team_invite"
  | "guild_app_accepted"
  | "guild_app_rejected"
  | "team_app_accepted"
  | "team_app_rejected"
  | "guild_kick"
  | "team_kick";

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  senderName?: string;
  type: NotifType;
  entityId: Types.ObjectId;
  entityName: string;
  entityTag?: string;
  status: "pending" | "accepted" | "declined" | "read";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "Character", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "Character" },
    senderName: { type: String },
    type: {
      type: String,
      enum: [
        "guild_invite", "team_invite",
        "guild_app_accepted", "guild_app_rejected",
        "team_app_accepted", "team_app_rejected",
        "guild_kick", "team_kick",
      ],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityName: { type: String, required: true },
    entityTag: { type: String },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "read"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
