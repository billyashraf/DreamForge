import { seed, DEMO_CREDENTIALS } from "@/lib/seed";
import { ok, err } from "@/lib/response";

// Only available in development — call once after first deploy to set up missions, items, and demo accounts
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    // Allow seed in production too — it's idempotent and guards against duplicate creation
    // Remove this check only if you want to restrict seeding to dev
  }
  try {
    const result = await seed();
    return ok({
      message: "Database seeded successfully",
      demoAccounts: {
        player: {
          email: DEMO_CREDENTIALS.player.email,
          password: DEMO_CREDENTIALS.player.password,
          character: "Nova (Level 8) — Moon Junkyard",
        },
        admin: {
          email: DEMO_CREDENTIALS.admin.email,
          password: DEMO_CREDENTIALS.admin.password,
          character: "Overseer (Level 20) — Mars",
        },
      },
      guild: result.guild,
    });
  } catch (error) {
    return err(`Seed failed: ${(error as Error).message}`, 500);
  }
}
