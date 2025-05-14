const getOTPTemplate = (otp) => {
  return `Kode OTP Anda adalah *${otp}*. Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.`;
};

const getResetPasswordTemplate = (resetLink) => {
  return `Untuk mereset kata sandi Anda, klik link berikut: ${resetLink}\nLink ini berlaku selama 1 jam.`;
};

const getNotificationTemplate = (message) => {
  return `Notifikasi: ${message}`;
};

module.exports = {
  getOTPTemplate,
  getResetPasswordTemplate,
  getNotificationTemplate,
};
