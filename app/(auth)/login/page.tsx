"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setCharacter } = useGameStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"player" | "admin" | null>(null);

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
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      setUser(data.data.user);
      setCharacter(data.data.character);
      router.push(data.data.user.role !== "player" ? "/admin" : data.data.hasCharacter ? "/dashboard" : "/character/create");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(type: "player" | "admin") {
    setDemoLoading(type);
    setError("");
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Demo login failed"); return; }
      setUser(data.data.user);
      setCharacter(data.data.character);
      router.push(type === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Connection error.");
    } finally {
      setDemoLoading(null);
    }
  }

  function fillDemo(type: "player" | "admin") {
    if (type === "player") setForm({ email: "demo@dreamforge.com", password: "DemoPlay3r!" });
    else setForm({ email: "admin@dreamforge.com", password: "AdminF0rge!" });
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <Link href="/" className="font-mono font-bold text-2xl">
            <span className="text-cyan-400">DREAM</span>
            <span className="text-gray-500">FORGE</span>
          </Link>
          <p className="text-xs font-mono text-gray-600 mt-1 uppercase tracking-widest">Access Terminal</p>
        </div>

        {/* Demo quick-access */}
        <div className="border border-yellow-900 bg-yellow-950/20 p-3 space-y-2">
          <div className="text-xs font-mono text-yellow-600 uppercase tracking-widest">Quick Demo Access</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => demoLogin("player")}
              disabled={!!demoLoading || loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-900/40 hover:bg-cyan-900/60 border border-cyan-900 text-cyan-300 font-mono text-xs transition-colors disabled:opacity-50"
            >
              {demoLoading === "player" && <span className="w-2.5 h-2.5 border border-cyan-300 border-t-transparent rounded-full animate-spin" />}
              PLAY AS NOVA
            </button>
            <button
              onClick={() => demoLogin("admin")}
              disabled={!!demoLoading || loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-900 text-red-300 font-mono text-xs transition-colors disabled:opacity-50"
            >
              {demoLoading === "admin" && <span className="w-2.5 h-2.5 border border-red-300 border-t-transparent rounded-full animate-spin" />}
              ADMIN VIEW
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-700">
            <button onClick={() => fillDemo("player")} className="text-left hover:text-gray-500 transition-colors truncate">
              fill: demo@dreamforge.com
            </button>
            <button onClick={() => fillDemo("admin")} className="text-left hover:text-gray-500 transition-colors truncate">
              fill: admin@dreamforge.com
            </button>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="border border-gray-800 p-5 space-y-4">
          <div className="text-xs font-mono text-gray-600 border-b border-gray-800 pb-2 mb-3 uppercase tracking-widest">
            Login with your account
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
          <Button type="submit" loading={loading} disabled={!!demoLoading} className="w-full" size="lg">
            ACCESS SYSTEM
          </Button>
        </form>

        <div className="text-center text-xs font-mono text-gray-600">
          No account?{" "}
          <Link href="/register" className="text-cyan-500 hover:text-cyan-400">Register here</Link>
          {" "}or{" "}
          <Link href="/" className="text-gray-500 hover:text-gray-400">back to home</Link>
        </div>
      </div>
    </main>
  );
}
