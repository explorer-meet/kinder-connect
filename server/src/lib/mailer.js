const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.MAILTRAP_HOST;
  const port = Number(process.env.MAILTRAP_PORT || 2525);
  const user = process.env.MAILTRAP_USER;
  const pass = process.env.MAILTRAP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    auth: { user, pass },
  });
};

const sendMailSafe = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, reason: 'mailtrap_not_configured' };
  }

  const from = process.env.MAIL_FROM || 'noreply@kinderconnect.local';
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, reason: 'missing_recipient' };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: recipients.join(','),
      subject,
      text,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { sent: false, reason: err.message };
  }
};

module.exports = {
  sendMailSafe,
};
