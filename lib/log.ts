import ActivityLog from "@/models/ActivityLog";
import { Types } from "mongoose";

export async function createLog(
  characterId: string | Types.ObjectId,
  type: string,
  message: string
) {
  try {
    await ActivityLog.create({ characterId, type, message });
  } catch {
    // non-fatal
  }
}
