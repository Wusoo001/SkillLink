const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
   host: 'smtp.gmail.com',
   port: 465,
   secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (to, token) => {
  const verifyUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;
  const mailOptions = {
    from: `Street <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your email – Street',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563EB;">Street</h1>
        <h2>Welcome!</h2>
        <p>Please click the button below to verify your email address and activate your account.</p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
        <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${verifyUrl}</p>
        <p style="color: #6B7280; font-size: 12px;">This link expires in 24 hours.</p>
        <p style="color: #6B7280; font-size: 12px;">If you didn't create an account, ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };