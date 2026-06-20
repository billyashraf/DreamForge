import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMessage extends Document {
  fromCharacterId: Types.ObjectId;
  fromName: string;
  toCharacterId: Types.ObjectId;
  toName: string;
  content: string;
  sentAt: Date;
  deliveredAt: Date;
  read: boolean;
}

const MessageSchema = new Schema<IMessage>({
  fromCharacterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
  fromName:        { type: String, required: true },
  toCharacterId:   { type: Schema.Types.ObjectId, ref: "Character", required: true },
  toName:          { type: String, required: true },
  content:         { type: String, required: true, maxlength: 500 },
  sentAt:          { type: Date, required: true },
  deliveredAt:     { type: Date, required: true },
  read:            { type: Boolean, default: false },
});

MessageSchema.index({ toCharacterId: 1, deliveredAt: 1 });
MessageSchema.index({ fromCharacterId: 1, sentAt: -1 });

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
