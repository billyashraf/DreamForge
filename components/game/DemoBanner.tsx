"use client";

import { useGameStore } from "@/store/useGameStore";

const DEMO_EMAILS = ["demo@dreameforge.com", "admin@dreameforge.com"];

export function DemoBanner() {
  const user = useGameStore((s) => s.user);
  if (!user || !DEMO_EMAILS.includes(user.email)) return null;

  const isAdmin = user.email === "admin@dreameforge.com";

  return (
    <div className={`text-xs font-mono px-4 py-1.5 text-center border-b ${
      isAdmin
        ? "bg-red-950 border-red-900 text-red-300"
        : "bg-yellow-950 border-yellow-900 text-yellow-300"
    }`}>
      {isAdmin ? (
        <>
          ADMIN DEMO — You are viewing the game as an administrator. All management features are available.
          Password: <span className="font-bold text-yellow-200">AdminF0rge!</span>
        </>
      ) : (
        <>
          PLAYER DEMO — Playing as Nova (Level 8). This is a shared demo account — progress resets periodically.
          Password: <span className="font-bold text-yellow-200">DemoPlay3r!</span>
        </>
      )}
    </div>
  );
}
