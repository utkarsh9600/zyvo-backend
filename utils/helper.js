// ==========================================================
// GLOBAL HELPER FUNCTIONS – ZYVO ROOMS
// ==========================================================

// ================= FORMAT DATE =================
const formatDate = (date) => {
  return new Date(date).toISOString().split("T")[0];
};

// ================= GENERATE RANDOM STRING =================
const generateId = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ================= SUCCESS RESPONSE =================
const sendSuccess = (res, data = {}, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

// ================= ERROR RESPONSE =================
const sendError = (res, message = "Something went wrong", code = 500) => {
  return res.status(code).json({
    success: false,
    message,
  });
};

module.exports = {
  formatDate,
  generateId,
  sendSuccess,
  sendError,
};