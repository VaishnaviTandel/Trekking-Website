const nodemailer = require("nodemailer");

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendEmail = async (to, subject, message) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("Email skipped: EMAIL_USER or EMAIL_PASS is missing.");
    return;
  }

  const payload =
    typeof message === "string"
      ? { text: message }
      : {
          text: message?.text,
          html: message?.html,
          attachments: message?.attachments
        };

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    ...payload
  });

};

module.exports = sendEmail;
