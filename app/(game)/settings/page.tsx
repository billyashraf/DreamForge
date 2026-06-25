"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();

  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [resendMsg, setResendMsg] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me").then(async (r) => {
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
      });
    }
  }, [user, router, setUser, setCharacter]);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      setResetMsg(res.ok ? data.data.message : data.error ?? "Failed to send reset email");
    } catch {
      setResetMsg("Connection error. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      setResendMsg(res.ok ? data.data.message : data.error ?? "Failed to resend email");
    } catch {
      setResendMsg("Connection error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-xs font-mono text-gray-600">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-mono font-bold text-cyan-400">⚙ Settings</h1>
          <p className="text-xs font-mono text-gray-600 mt-1">Account preferences and security</p>
        </div>

        {/* Account status */}
        <Card title="Account Status">
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-300">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Role</span>
              <span className={
                user.role === "admin" ? "text-red-400" :
                user.role === "moderator" ? "text-yellow-400" :
                "text-gray-400"
              }>{user.role.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Verification</span>
              {user.emailVerified ? (
                <span className="text-green-400">✓ VERIFIED</span>
              ) : (
                <span className="text-orange-400">⚠ UNVERIFIED</span>
              )}
            </div>
          </div>

          {!user.emailVerified && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs font-mono text-gray-500 mb-3">
                Your account is unverified. Check your inbox or request a new verification email.
                Unverified accounts are deleted after 5 days.
              </p>
              {resendMsg && (
                <div className={`text-xs font-mono p-2 border mb-3 ${resendMsg.includes("sent") ? "border-green-800 text-green-400" : "border-red-800 text-red-400"}`}>
                  {resendMsg}
                </div>
              )}
              <Button
                size="sm"
                variant="secondary"
                loading={resendLoading}
                onClick={handleResendVerification}
              >
                Resend Verification Email
              </Button>
            </div>
          )}
        </Card>

        {/* Password reset */}
        <Card title="Change Password">
          <p className="text-xs font-mono text-gray-500 mb-4">
            Enter your email address and we will send you a password reset link.
          </p>
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <Input
              label="Email address"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder={user.email}
              required
            />
            {resetMsg && (
              <div className={`text-xs font-mono p-2 border ${resetMsg.toLowerCase().includes("sent") || resetMsg.toLowerCase().includes("registered") ? "border-green-800 text-green-400" : "border-red-800 text-red-400"}`}>
                {resetMsg}
              </div>
            )}
            <Button type="submit" loading={resetLoading} size="sm">
              Send Reset Link
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
