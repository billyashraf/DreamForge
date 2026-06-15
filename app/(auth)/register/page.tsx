"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useGameStore((s) => s.setUser);

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.error ?? "Registration failed" });
        return;
      }

      // Fetch user info after registration
      const me = await fetch("/api/auth/me");
      if (me.ok) {
        const meData = await me.json();
        setUser(meData.data.user);
      }

      router.push("/character/create");
    } catch {
      setErrors({ general: "Connection error. Please try again." });
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
            New Operator Registration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border border-gray-800 p-6 space-y-4">
          <div className="text-xs font-mono text-gray-600 border-b border-gray-800 pb-3 mb-4 uppercase tracking-widest">
            Create Account
          </div>

          <Input
            label="Username"
            type="text"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="Operator_01"
            required
            minLength={3}
            maxLength={20}
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@metapolis.net"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="8+ chars, 1 uppercase, 1 number"
            required
            autoComplete="new-password"
          />

          <div className="text-xs font-mono text-gray-700 space-y-0.5">
            <p>Requirements: 8+ characters, 1 uppercase, 1 number</p>
          </div>

          {errors.general && (
            <div className="border border-red-900 bg-red-950 p-2 text-xs font-mono text-red-400">
              ERROR: {errors.general}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            REGISTER OPERATOR
          </Button>
        </form>

        <div className="text-center text-xs font-mono text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-500 hover:text-cyan-400">
            Login here
          </Link>
        </div>
      </div>
    </main>
  );
}
