import crypto from "crypto";

export const generateBookingId = () => {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `STZ-${timestamp}-${random}`;
};