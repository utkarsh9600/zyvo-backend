const jwt = require("jsonwebtoken");

/* =====================================================
   AUTH MIDDLEWARE – ZYVO ENTERPRISE VERSION
===================================================== */

module.exports = function (req, res, next) {
  try {
    const header = req.headers.authorization;

    /* ---------- CHECK TOKEN EXISTS ---------- */
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = header.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    /* ---------- VERIFY TOKEN ---------- */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    /* ---------- ATTACH USER TO REQUEST ---------- */
    req.user = {
      id: decoded.id,
      _id: decoded.id, // compatibility
      role: decoded.role || "USER",
    };

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};