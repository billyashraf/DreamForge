"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function CharacterCreatePage() {
  const router = useRouter();
  const { user, setCharacter } = useGameStore();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create character");
        return;
      }

      setCharacter(data.data.character);
      router.push("/dashboard");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-2">
            Character Creation
          </div>
          <h1 className="text-2xl font-mono font-bold text-cyan-400">
            Welcome to Metapolis
          </h1>
          <p className="text-sm font-mono text-gray-500 mt-2">
            You have arrived at the Moon&apos;s great iron-dome city.<br />
            Choose your identity carefully. You will carry this name forever.
          </p>
        </div>

        <div className="border border-gray-800 p-6 space-y-6">
          <div className="space-y-2 font-mono text-xs text-gray-600">
            <div className="border-b border-gray-800 pb-3 mb-4 uppercase tracking-widest">
              Starting Stats
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span>Level</span><span className="text-gray-400">1</span>
              <span>Health</span><span className="text-gray-400">100 / 100</span>
              <span>Energy</span><span className="text-gray-400">100 / 100</span>
              <span>Credits</span><span className="text-cyan-400">500¢</span>
              <span>Strength</span><span className="text-gray-400">5</span>
              <span>Intelligence</span><span className="text-gray-400">5</span>
              <span>Agility</span><span className="text-gray-400">5</span>
              <span>Location</span><span className="text-cyan-400">Metapolis</span>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Character Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your legend name..."
              required
              minLength={2}
              maxLength={20}
            />
            <p className="text-xs font-mono text-gray-700">
              2–20 characters. Letters, numbers, spaces, hyphens, underscores allowed.
            </p>

            {error && (
              <div className="border border-red-900 bg-red-950 p-2 text-xs font-mono text-red-400">
                ERROR: {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              ENTER METAPOLIS
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
