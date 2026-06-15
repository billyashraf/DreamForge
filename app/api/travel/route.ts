import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/response";
import Character from "@/models/Character";

const TRAVEL_COSTS: Record<string, number> = {
  metapolis: 0,
  moon_junkyard: 0,
  earth: 200,
  mars: 350,
};

const TRAVEL_REQUIREMENTS: Record<string, number> = {
  earth: 5,
  mars: 10,
};

const LOCATION_DESCRIPTIONS: Record<string, string> = {
  metapolis: "You are in Metapolis, the massive megacity beneath the iron dome of the Moon.",
  moon_junkyard: "You venture into the Moon Junkyard â€” a dangerous scrapyard outside the dome.",
  earth: "You step through the Earth Gate into a post-apocalyptic world of mutated beasts and lost civilizations.",
  mars: "You emerge on Mars, where guild wars and battle royale tournaments determine the fate of territories.",
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.destination) return err("Destination is required");

  const destination = body.destination as string;
  const validDestinations = ["metapolis", "moon_junkyard", "earth", "mars"];

  if (!validDestinations.includes(destination)) {
    return err(`Invalid destination. Choose from: ${validDestinations.join(", ")}`);
  }

  await connectDB();

  const character = await Character.findOne({ userId: session.userId });
  if (!character) return err("Character not found", 404);

  if (character.currentLocation === destination) {
    return err(`You are already in ${destination.replace("_", " ")}`);
  }

  const levelReq = TRAVEL_REQUIREMENTS[destination];
  if (levelReq && character.level < levelReq) {
    return err(`You need to be level ${levelReq} to travel to ${destination.replace("_", " ")}`);
  }

  const cost = TRAVEL_COSTS[destination] ?? 0;
  if (character.credits < cost) {
    return err(`Not enough credits. Travel to ${destination.replace("_", " ")} costs ${cost} credits.`);
  }

  character.currentLocation = destination;
  if (cost > 0) character.credits -= cost;
  await character.save();

  return ok({
    message: LOCATION_DESCRIPTIONS[destination],
    location: destination,
    creditsSpent: cost,
    creditsRemaining: character.credits,
  });
}
