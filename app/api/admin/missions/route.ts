import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { missionSchema } from "@/lib/validations";
import { ok, err, unauthorized } from "@/lib/response";
import Mission from "@/models/Mission";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "moderator") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  await connectDB();

  const missions = await Mission.find().sort({ createdAt: -1 });
  return ok({ missions });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON");

  const parsed = missionSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  await connectDB();

  const mission = await Mission.create(parsed.data);
  return ok({ message: "Mission created", mission }, 201);
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.id) return err("Mission id is required");

  const { id, ...updates } = body;
  const parsed = missionSchema.partial().safeParse(updates);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  await connectDB();

  const mission = await Mission.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!mission) return err("Mission not found", 404);

  return ok({ message: "Mission updated", mission });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.id) return err("Mission id is required");

  await connectDB();

  const mission = await Mission.findByIdAndUpdate(
    body.id,
    { isActive: !!body.isActive },
    { new: true }
  );
  if (!mission) return err("Mission not found", 404);

  return ok({ message: mission.isActive ? "Mission reactivated" : "Mission deactivated" });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return err("Mission id is required");

  await connectDB();

  const mission = await Mission.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!mission) return err("Mission not found", 404);

  return ok({ message: "Mission deactivated" });
}
