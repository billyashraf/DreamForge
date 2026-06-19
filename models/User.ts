import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  googleId?: string;
  role: "player" | "moderator" | "admin";
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: "" },
    googleId: { type: String, sparse: true, unique: true },
    role: { type: String, enum: ["player", "moderator", "admin"], default: "player" },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
