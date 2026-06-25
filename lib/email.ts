import nodemailer from "nodemailer";

function isSmtpConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return (
    SMTP_HOST && SMTP_HOST !== "smtp.example.com" &&
    SMTP_USER && SMTP_USER !== "noreply@example.com" &&
    SMTP_PASS && SMTP_PASS !== "your-smtp-password"
  );
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

function getFrom() {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  return `"DreameForge" <${process.env.SMTP_USER}>`;
}

async function sendMail(options: nodemailer.SendMailOptions) {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("\n[EMAIL DEV FALLBACK] SMTP not configured — printing email to console:");
      console.log("  To:", options.to);
      console.log("  Subject:", options.subject);
      console.log("  Text:", options.text);
      console.log("");
      return;
    }
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.");
  }
  await getTransporter().sendMail(options);
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;
  await sendMail({
    from: getFrom(),
    to,
    subject: "Verify your DreameForge account",
    html: `
      <div style="font-family:monospace;background:#030712;color:#e5e7eb;padding:32px;max-width:480px">
        <h2 style="color:#22d3ee;margin-top:0">⚒️ DREAMEFORGE</h2>
        <p>Click the link below to verify your account. The link expires in <strong>24 hours</strong>.</p>
        <p><a href="${url}" style="color:#22d3ee">${url}</a></p>
        <p style="color:#6b7280;font-size:12px">If you did not create an account, ignore this email.</p>
      </div>`,
    text: `Verify your DreameForge account: ${url}\nLink expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendMail({
    from: getFrom(),
    to,
    subject: "Reset your DreameForge password",
    html: `
      <div style="font-family:monospace;background:#030712;color:#e5e7eb;padding:32px;max-width:480px">
        <h2 style="color:#22d3ee;margin-top:0">⚒️ DREAMEFORGE</h2>
        <p>Click the link below to reset your password. The link expires in <strong>1 hour</strong>.</p>
        <p><a href="${url}" style="color:#22d3ee">${url}</a></p>
        <p style="color:#6b7280;font-size:12px">If you did not request a password reset, ignore this email.</p>
      </div>`,
    text: `Reset your DreameForge password: ${url}\nLink expires in 1 hour.`,
  });
}
