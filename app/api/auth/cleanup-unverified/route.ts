import { NextRequest } from "next/server";
import { err, ok } from "@/lib/response";

export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-cleanup-secret");
  if (!secret || secret !== process.env.CLEANUP_SECRET) {
    return err("Unauthorized", 401);
  }

  // Auto-deletion of unverified accounts is disabled — unverified accounts are kept indefinitely
  return ok({ deleted: 0 });
}
