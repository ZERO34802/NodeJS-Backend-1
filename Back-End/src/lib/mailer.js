const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendMail({ to, from, subject, text, html }) {
  const payload = {
    from: from || process.env.MAIL_FROM, // e.g., "Auth App <no-reply@yourdomain.com>"
    to,
    subject,
    // Prefer HTML but include text fallback if provided
    html: html || (text ? `<pre>${text}</pre>` : "<p></p>"),
    text,
  };
  const { error } = await resend.emails.send(payload);
  if (error) throw error;
}

module.exports = { transporter: { sendMail } };
