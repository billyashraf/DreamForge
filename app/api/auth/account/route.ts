import { getSession, clearSessionCookie } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import { deleteAccount } from "@/lib/deleteAccount";

export async function DELETE() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  await deleteAccount(session.userId);

  const response = ok({ message: "Account deleted" });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
