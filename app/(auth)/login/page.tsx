"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled:      "Google sign-in was cancelled.",
  google_not_configured: "Google sign-in is not configured on this server.",
  google_invalid:        "Invalid OAuth response from Google.",
  google_state:          "OAuth state mismatch — possible CSRF. Please try again.",
  google_token:          "Failed to exchange auth code with Google.",
  google_userinfo:       "Failed to retrieve Google account info.",
  google_no_email:       "Your Google account has no verified email address.",
  banned:                "Your account has been suspended.",
};

// useSearchParams must live inside a Suspense boundary in Next.js App Router
function OAuthErrorReader({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) onError(GOOGLE_ERROR_MESSAGES[oauthError] ?? "Google sign-in failed.");
  }, [searchParams, onError]);
  return null;
}

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
      <Suspense fallback={null}>
        <OAuthErrorReader onError={setError} />
      </Suspense>
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <Link href="/" className="font-mono font-bold text-2xl">
            <span className="text-cyan-400">DREAM</span>
            <span className="text-gray-500">FORGE</span>
          </Link>
          <p className="text-xs font-mono text-gray-600 mt-1 uppercase tracking-widest">Access Terminal</p>
        </div>

        {/* Google sign-in */}
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full py-2.5 border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 transition-colors font-mono text-sm text-gray-200"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.328-1.584-5.036-3.7122H.957v2.3318C2.4382 15.9832 5.4818 18 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.957A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.957 4.0418L3.964 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.957 4.9582L3.964 7.29C4.672 5.1618 6.656 3.5795 9 3.5795Z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </a>

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
