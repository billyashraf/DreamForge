import { seed } from "@/lib/seed";
import { ok, err } from "@/lib/response";

// Only available in development mode
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return err("Seed endpoint disabled in production", 403);
  }
  try {
    await seed();
    return ok({ message: "Database seeded successfully" });
  } catch (error) {
    return err(`Seed failed: ${(error as Error).message}`, 500);
  }
}
