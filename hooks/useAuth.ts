"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export function useAuth(requireCharacter = false) {
  const router = useRouter();
  const { user, character, setUser, setCharacter } = useGameStore();

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const { data } = await res.json();
        setUser(data.user);
        setCharacter(data.character);

        if (requireCharacter && !data.character) {
          router.push("/character/create");
        }
      } catch {
        router.push("/login");
      }
    }

    if (!user) fetchSession();
  }, [user, router, setUser, setCharacter, requireCharacter]);

  return { user, character };
}
