// ==========================================================
// ZYVO ROOMS – ENTERPRISE PRODUCTION SERVER
// Scalable • Secure • Razorpay Ready • Funding Grade
// ==========================================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const Razorpay = require("razorpay");

// ==========================================================
// ================= APP INIT ===============================
// ==========================================================

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================================
// ================= SECURITY MIDDLEWARE ====================
// ==========================================================

// Secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS (production safe)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use(globalLimiter);

// Extra strict limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

// ==========================================================
// ================= DATABASE CONNECTION ====================
// ==========================================================

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// ==========================================================
// ================= RAZORPAY INIT ==========================
// ==========================================================

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("⚠️ Razorpay keys missing in .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Make Razorpay available everywhere
app.locals.razorpay = razorpay;

// ==========================================================
// ================= ROUTES IMPORT ==========================
// ==========================================================

const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

// ==========================================================
// ================= ROUTES USE =============================
// ==========================================================

// Auth routes (extra protection)
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/hotels", hotelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);

// ==========================================================
// ================= HEALTH CHECK ===========================
// ==========================================================

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "🚀 Zyvo Enterprise Backend Running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date(),
  });
});

// ==========================================================
// ================= 404 HANDLER ============================
// ==========================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ==========================================================
// ================= GLOBAL ERROR HANDLER ===================
// ==========================================================

app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// ==========================================================
// ================= GRACEFUL SHUTDOWN ======================
// ==========================================================

process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Server terminated");
  await mongoose.connection.close();
  process.exit(0);
});

// ==========================================================
// ================= START SERVER ===========================
// ==========================================================

app.listen(PORT, () => {
  console.log(`
==================================================
🚀 ZYVO ENTERPRISE SERVER STARTED
🌍 Port: ${PORT}
🔐 Mode: ${process.env.NODE_ENV || "development"}
==================================================
  `);
});