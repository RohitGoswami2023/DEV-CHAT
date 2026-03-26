//server/lib/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

export const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com", 
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error(`❌ SMTP Connection Error (Port ${smtpPort}):`, error.message);
    if (smtpPort === 587) console.warn("💡 Tip: Try setting SMTP_PORT=2525 in your environment variables if 587 is timed out.");
  } else {
    console.log(`✅ SMTP Server is ready on port ${smtpPort}`);
  }
});

export const sendOTPEmail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject: "Your OTP for Chat App",
      text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    });
   // console.log(`OTP sent to ${to}: ${otp}`);
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP email");
  }
};

export const sendReminderEmail = async (to, reminder) => {
  try {
    const fireTime = new Date(reminder.scheduledAt).toLocaleString();
    const info = await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject: `\u23f0 Reminder in 15 minutes: "${reminder.text.substring(0, 40)}${reminder.text.length > 40 ? '...' : ''}",`,
      html: `
        <div style="font-family:sans-serif;padding:24px;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#6366f1">\u23f0 Upcoming Reminder</h2>
          <p style="font-size:16px;color:#374151">${reminder.text}</p>
          <p style="color:#9ca3af;font-size:14px">Scheduled for: <strong>${fireTime}</strong></p>
          <p style="color:#9ca3af;font-size:13px">This is an automated reminder from your DEV-CHAT workspace.</p>
        </div>
      `,
    });
    console.log("[Mailer] Reminder email sent, messageId:", info?.messageId);
  } catch (error) {
    console.error("[Mailer] \u274c Failed to send reminder email to", to);
    console.error("[Mailer] SMTP error:", error?.responseCode, error?.response || error?.message);
  }
};
