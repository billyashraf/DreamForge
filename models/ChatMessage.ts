import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IChatMessage extends Document {
  type: "team" | "guild";
  groupId: Types.ObjectId;
  characterId: Types.ObjectId;
  characterName: string;
  content: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    type:          { type: String, enum: ["team", "guild"], required: true },
    groupId:       { type: Schema.Types.ObjectId, required: true },
    characterId:   { type: Schema.Types.ObjectId, ref: "Character", required: true },
    characterName: { type: String, required: true },
    content:       { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ groupId: 1, createdAt: -1 });
// Auto-expire after 24 hours
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
export default ChatMessage;
