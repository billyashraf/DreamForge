import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Character from "@/models/Character";
import { ok, err, unauthorized } from "@/lib/response";
import { SHADOW_FORMS } from "@/lib/shadowForms";

const VALID_IDS = new Set(SHADOW_FORMS.map(f => f.id));

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const char = await Character.findOne({ userId: session.userId }).select("shadowForm");
  if (!char) return err("Character not found", 404);
  return ok({ shadowForm: char.shadowForm ?? null });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    await connectDB();

    const body = await req.json().catch(() => null);
    const { form } = (body ?? {}) as { form?: string };
    if (!form || !VALID_IDS.has(form as never)) return err("Invalid form");

    const updated = await Character.findOneAndUpdate(
      { userId: session.userId },
      { $set: { shadowForm: form } },
      { new: true }
    ).select("shadowForm");

    if (!updated) return err("Character not found", 404);
    return ok({ shadowForm: updated.shadowForm });
  } catch (e) {
    console.error("[shadow-form POST]", e);
    return err("Internal server error", 500);
  }
}
