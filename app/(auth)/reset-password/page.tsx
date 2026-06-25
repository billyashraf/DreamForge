"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
      setSuccess("Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <Link href="/" className="font-mono font-bold text-2xl">
            <span className="text-cyan-400">DREAM</span>
            <span className="text-gray-500">FORGE</span>
          </Link>
          <p className="text-xs font-mono text-gray-600 mt-1 uppercase tracking-widest">Reset Password</p>
        </div>

        {success ? (
          <div className="border border-green-800 bg-green-950/20 p-4 text-center">
            <p className="text-xs font-mono text-green-400">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="border border-gray-800 p-5 space-y-4">
            <div className="text-xs font-mono text-gray-600 border-b border-gray-800 pb-2 mb-3 uppercase tracking-widest">
              New Password
            </div>
            <Input
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <p className="text-[10px] font-mono text-gray-600">
              Min 8 characters, one uppercase letter, one number.
            </p>
            {error && (
              <div className="border border-red-900 bg-red-950 p-2 text-xs font-mono text-red-400">
                ERROR: {error}
              </div>
            )}
            <Button type="submit" loading={loading} disabled={!token} className="w-full" size="lg">
              UPDATE PASSWORD
            </Button>
          </form>
        )}

        <div className="text-center text-xs font-mono text-gray-600">
          <Link href="/login" className="text-cyan-500 hover:text-cyan-400">Back to login</Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
