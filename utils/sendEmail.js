const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,

    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return await transporter.sendMail({
    from: `"Employee Management" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject,
    html,
  });
};

module.exports = sendEmail;
