import nodemailer from "nodemailer";

const DEV_MODE = !process.env.EMAIL_HOST;

function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

function verifyHtml(username: string, verifyUrl: string): string {
  return `<!DOCTYPE html><html><body style="background:#030712;color:#9ca3af;font-family:monospace;padding:32px;max-width:480px">
<h1 style="color:#22d3ee;letter-spacing:4px;font-size:18px">DREAMFORGE</h1>
<p style="color:#6b7280;font-size:11px;letter-spacing:2px;text-transform:uppercase">Terminal Verification</p>
<hr style="border-color:#1f2937;margin:16px 0">
<p>Operator <strong style="color:#e5e7eb">${username}</strong>,</p>
<p>A new access terminal has been registered. Verify your email to activate your account:</p>
<a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:10px 24px;background:#0e7490;color:#e0f2fe;text-decoration:none;letter-spacing:2px;font-size:12px;text-transform:uppercase">VERIFY ACCESS →</a>
<p style="font-size:11px;color:#4b5563">This link expires in 24 hours. If you did not register, ignore this message.</p>
<hr style="border-color:#1f2937;margin:16px 0">
<p style="font-size:10px;color:#374151">— DreameForge Operations Command</p>
</body></html>`;
}

export async function sendVerificationEmail(
  to: string,
  username: string,
  token: string,
  baseUrl: string,
): Promise<{ devUrl?: string }> {
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  if (DEV_MODE) {
    console.log(`\n[DEV] Email verification for ${username} <${to}>\n  ${verifyUrl}\n`);
    return { devUrl: verifyUrl };
  }

  await makeTransport().sendMail({
    from: process.env.EMAIL_FROM ?? "DreameForge <noreply@dreamforge.com>",
    to,
    subject: "DreameForge — Verify Your Terminal Access",
    text: `Operator ${username},\n\nVerify your DreameForge account:\n${verifyUrl}\n\nExpires in 24 hours.\n\n— DreameForge Operations Command`,
    html: verifyHtml(username, verifyUrl),
  });

  return {};
}
