const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (to, token) => {
  const verifyUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;

  const { error } = await resend.emails.send({
    from: 'Street <onboarding@resend.dev>',
    to: [to],
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
  });

  if (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send verification email");
  }
};

module.exports = { sendVerificationEmail };