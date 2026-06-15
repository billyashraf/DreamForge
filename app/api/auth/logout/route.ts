import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/response";

export async function POST() {
  const response = ok({ message: "Logged out successfully" });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
