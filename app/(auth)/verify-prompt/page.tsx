"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function VerifyPromptContent() {
  const searchParams = useSearchParams();
  const email  = searchParams.get("email") ?? "";
  const devUrl = searchParams.get("devUrl") ?? "";

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function resend() {
    setResending(true);
    setResendMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResendMsg(data.data?.message ?? data.error ?? "Done.");
      if (data.data?.devUrl) {
        window.location.href = `/verify-prompt?email=${encodeURIComponent(email)}&devUrl=${encodeURIComponent(data.data.devUrl)}`;
      }
    } catch {
      setResendMsg("Connection error.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <Link href="/" className="font-mono font-bold text-2xl">
            <span className="text-cyan-400">DREAM</span>
            <span className="text-gray-500">FORGE</span>
          </Link>
        </div>

        <div className="border border-gray-800 p-6 space-y-4">
          <div className="text-4xl">✉</div>
          <div className="text-sm font-mono font-bold text-gray-200 uppercase tracking-widest">
            Check Your Inbox
          </div>
          <p className="text-xs font-mono text-gray-500 leading-relaxed">
            A verification link has been dispatched to{" "}
            <span className="text-cyan-400">{email || "your email"}</span>.
            <br />
            Click the link to activate your account.
          </p>
          <p className="text-xs font-mono text-gray-700">
            The link expires in 24 hours.
          </p>

          {/* Dev mode: show direct link when no email is configured */}
          {devUrl && (
            <div className="border border-yellow-900 bg-yellow-950/20 p-3 space-y-2 text-left">
              <p className="text-xs font-mono text-yellow-600 uppercase tracking-widest">
                Dev mode — no email configured
              </p>
              <p className="text-xs font-mono text-gray-500">
                Click below to verify instantly:
              </p>
              <a
                href={devUrl}
                className="block text-xs font-mono text-cyan-400 underline break-all"
              >
                {devUrl}
              </a>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Button
              onClick={resend}
              loading={resending}
              disabled={!email}
              variant="secondary"
              className="w-full"
            >
              Resend Verification Email
            </Button>
            {resendMsg && (
              <p className="text-xs font-mono text-gray-500">{resendMsg}</p>
            )}
          </div>
        </div>

        <div className="text-center text-xs font-mono text-gray-600">
          <Link href="/login" className="text-cyan-500 hover:text-cyan-400">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPromptPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-xs font-mono text-gray-600">Loading...</span>
      </main>
    }>
      <VerifyPromptContent />
    </Suspense>
  );
}
