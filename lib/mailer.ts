import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,           // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a plain transactional email.
 */
export async function sendMail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

/**
 * Send a styled OTP email.
 */
export async function sendOtpEmail(to: string, otp: string, purpose: "registration" | "password-reset" = "registration") {
  const title  = purpose === "registration" ? "Verify your email" : "Reset your password";
  const action = purpose === "registration"
    ? "complete your registration on SalonOS"
    : "reset your SalonOS password";

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8" /></head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px;text-align:center;">
              <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:24px;">✂️</span>
              </div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">SalonOS</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">${title}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">Hi there 👋</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                Use the one-time code below to ${action}. This code is valid for <strong>10 minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#f1f5f9;border:2px dashed #c4b5fd;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:12px;color:#7c3aed;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Your OTP Code</p>
                <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:12px;color:#6d28d9;font-family:monospace;">${otp}</p>
              </div>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you didn't request this, please ignore this email. Your account is safe.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 SalonOS · All rights reserved</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  await sendMail(to, `${otp} is your SalonOS verification code`, html);
}
