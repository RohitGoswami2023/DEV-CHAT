// lib/otpGenerator.js
export const generateOTP = (length = 6) => {
  return String(Math.floor(100000 + Math.random() * 900000)).padStart(length, "0");
};
