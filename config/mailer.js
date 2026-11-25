const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmployeeWelcomeEmail = async ({ email, employeeId, setupUrl }) => {
  const mailOptions = {
    from: `"EMS Portal" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Welcome to EMS Portal - Complete Your Account Setup",

    html: `
      <div style="font-family: Arial; max-width: 600px; margin: auto;">
        <h2 style="color: #166534;">
          Welcome to EMS Portal!
        </h2>

        <p>Hello,</p>

        <p>
          Your employee account has been created successfully
          by the administrator.
        </p>

        <p>
          <strong>Employee ID:</strong> ${employeeId}
        </p>

        <p>
          <strong>Email:</strong> ${email}
        </p>

        <p>
          Please click below to activate your account
          and set your password.
        </p>

        <a href="${setupUrl}"
          style="
            display: inline-block;
            background: #166534;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 6px;
          ">
          Activate My Account
        </a>

        <p>
          After activation, please log in and complete
          your basic employee profile.
        </p>

        <p>Regards,<br/>EMS Administration Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  transporter,
  sendEmployeeWelcomeEmail,
};
