"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useGameStore((s) => s.setUser);
  const setCharacter = useGameStore((s) => s.setCharacter);

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      setUser(data.data.user);
      setCharacter(data.data.character);

      if (!data.data.hasCharacter) {
        router.push("/character/create");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="font-mono font-bold text-2xl">
            <span className="text-cyan-400">DREAME</span>
            <span className="text-gray-500">FORGE</span>
          </Link>
          <p className="text-xs font-mono text-gray-600 mt-2 uppercase tracking-widest">
            Access Terminal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border border-gray-800 p-6 space-y-4">
          <div className="text-xs font-mono text-gray-600 border-b border-gray-800 pb-3 mb-4 uppercase tracking-widest">
            Login
          </div>

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="operator@metapolis.net"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="border border-red-900 bg-red-950 p-2 text-xs font-mono text-red-400">
              ERROR: {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            ACCESS SYSTEM
          </Button>
        </form>

        <div className="text-center text-xs font-mono text-gray-600">
          No account?{" "}
          <Link href="/register" className="text-cyan-500 hover:text-cyan-400">
            Register here
          </Link>
        </div>
      </div>
    </main>
  );
}
