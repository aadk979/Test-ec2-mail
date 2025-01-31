require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const { simpleParser } = require("mailparser");
const Mailin = require("mailin");

const app = express();
const PORT = 3000;

// Start the mail receiver using Mailin
Mailin.start({
  port: 25, // Standard SMTP port, should match your Postfix settings
  disableWebhook: true, // We are processing emails manually
  smtpOptions: { banner: "Voltz Proxy Mail Server" },
});

Mailin.on("message", async (connection, rawEmail) => {
  try {
    // Parse the raw email
    const parsed = await simpleParser(rawEmail);
    const { from, to, subject, text, html } = parsed;

    console.log(`Received email from: ${from.text}`);
    console.log(`To: ${to.text}`);
    console.log(`Subject: ${subject}`);

    // Extract the alias (e.g., u873b38f2@mail.voltz-testing.com)
    const recipient = to.value[0].address;
    const alias = recipient.split("@")[0]; // Get the alias part

    // Forward email to real address
    await forwardEmail({ alias, from: from.text, subject, text, html });
  } catch (error) {
    console.error("Error processing email:", error);
  }
});

// Function to forward the email to your real inbox
async function forwardEmail({ alias, from, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Set true if using SSL (port 465)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `Proxy Mail <noreply@${process.env.DOMAIN}>`,
    to: process.env.FORWARD_TO, // The email where the email is forwarded
    subject: `[Proxy: ${alias}] ${subject}`,
    text: `Original Sender: ${from}\n\n${text}`,
    html: `<p><strong>Original Sender:</strong> ${from}</p><br>${html}`,
  };

  // Send the forwarded email
  await transporter.sendMail(mailOptions);
  console.log(`Forwarded email for alias ${alias} to ${process.env.FORWARD_TO}`);
}

// Start the Express server (optional, useful for other routes)
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
