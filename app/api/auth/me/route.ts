import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import { applyEnergyRegen } from "@/lib/energy";
import User from "@/models/User";
import Character from "@/models/Character";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const user = await User.findById(session.userId).select("-passwordHash");
  if (!user) return unauthorized();

  const character = await Character.findOne({ userId: user._id }).select(
    "name level experience health maxHealth energy maxEnergy credits strength intelligence agility skills currentLocation guildId teamId lastEnergyRegen shadowForm"
  );

  if (character) await applyEnergyRegen(character);

  return ok({
    user: { id: user._id, username: user.username, email: user.email, role: user.role },
    character: character
      ? { id: character._id.toString(), ...character.toObject() }
      : null,
  });
}
