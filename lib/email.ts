import nodemailer from "nodemailer";

function isResendProvider(): boolean {
  return process.env.SMTP_HOST === "smtp.resend.com" && !!process.env.SMTP_PASS;
}

function isSmtpConfigured(): boolean {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || SMTP_HOST === "smtp.example.com") return false;
  if (!SMTP_PASS || SMTP_PASS === "your-smtp-password") return false;
  if (isResendProvider()) return true;
  // Generic SMTP: require a non-placeholder user and a valid from address
  if (!SMTP_USER || SMTP_USER === "noreply@example.com") return false;
  const from = process.env.SMTP_FROM ?? SMTP_USER;
  return from.includes("@");
}

function getFrom(): string {
  const configured = process.env.SMTP_FROM;
  // SMTP_FROM must be a full email address (e.g. noreply@glassmasks.com), not just a domain
  if (configured && configured.includes("@")) return configured;
  if (isResendProvider()) return "onboarding@resend.dev";
  return `"DreameForge" <${process.env.SMTP_USER}>`;
}

async function sendViaResend(
  to: string,
  from: string,
  subject: string,
  html: string,
  text: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SMTP_PASS}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`Resend API ${res.status}: ${body.message ?? "unknown error"}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });
}

async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("\n[EMAIL DEV FALLBACK] Email not configured — printing to console:");
      console.log("  To:", to);
      console.log("  Subject:", subject);
      console.log("  Text:", text);
      console.log("");
      return;
    }
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_PASS in your environment.");
  }

  const from = getFrom();

  if (isResendProvider()) {
    await sendViaResend(to, from, subject, html, text);
  } else {
    await getTransporter().sendMail({ from, to, subject, html, text });
  }
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;
  await sendMail(
    to,
    "Verify your DreameForge account",
    `
      <div style="font-family:monospace;background:#030712;color:#e5e7eb;padding:32px;max-width:480px">
        <h2 style="color:#22d3ee;margin-top:0">⚒️ DREAMEFORGE</h2>
        <p>Click the link below to verify your account. The link expires in <strong>24 hours</strong>.</p>
        <p><a href="${url}" style="color:#22d3ee">${url}</a></p>
        <p style="color:#6b7280;font-size:12px">If you did not create an account, ignore this email.</p>
      </div>`,
    `Verify your DreameForge account: ${url}\nLink expires in 24 hours.`,
  );
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendMail(
    to,
    "Reset your DreameForge password",
    `
      <div style="font-family:monospace;background:#030712;color:#e5e7eb;padding:32px;max-width:480px">
        <h2 style="color:#22d3ee;margin-top:0">⚒️ DREAMEFORGE</h2>
        <p>Click the link below to reset your password. The link expires in <strong>1 hour</strong>.</p>
        <p><a href="${url}" style="color:#22d3ee">${url}</a></p>
        <p style="color:#6b7280;font-size:12px">If you did not request a password reset, ignore this email.</p>
      </div>`,
    `Reset your DreameForge password: ${url}\nLink expires in 1 hour.`,
  );
}
