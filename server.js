// ==========================================================
// ZYVO ROOMS – ENTERPRISE PRODUCTION SERVER
// Secure • Scalable • Webhook Safe • Cron Ready
// ==========================================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const Razorpay = require("razorpay");
const cron = require("node-cron");

// ==========================================================
// ENV VALIDATION
// ==========================================================

const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});

// ==========================================================
// APP INIT
// ==========================================================

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// ==========================================================
// SECURITY
// ==========================================================

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(compression());

// ==========================================================
// CORS
// ==========================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
  "https://zyvo-frontend.onrender.com"
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

// ==========================================================
// WEBHOOK RAW BODY (IMPORTANT)
// ==========================================================

app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" })
);

// ==========================================================
// BODY PARSER
// ==========================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================================================
// LOGGING
// ==========================================================

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ==========================================================
// RATE LIMITING
// ==========================================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
});

// ==========================================================
// DATABASE
// ==========================================================

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ==========================================================
// RAZORPAY
// ==========================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.locals.razorpay = razorpay;

// ==========================================================
// ROUTES IMPORT
// ==========================================================

const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const searchRoutes = require("./routes/searchRoutes");

const releaseExpiredLocks = require("./utils/lockCleaner");

// ==========================================================
// ROUTES USE
// ==========================================================

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/search", searchRoutes);

// ==========================================================
// CRON JOBS
// ==========================================================

cron.schedule("* * * * *", async () => {
  try {
    await releaseExpiredLocks();
  } catch (err) {
    console.error("Lock Cleaner Error:", err.message);
  }
});

// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "🚀 Zyvo Enterprise Backend Running",
    environment: process.env.NODE_ENV || "development",
  });
});

// ==========================================================
// 404
// ==========================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================

app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// ==========================================================
// GRACEFUL SHUTDOWN
// ==========================================================

process.on("SIGINT", async () => {
  console.log("🛑 Shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Terminated");
  await mongoose.connection.close();
  process.exit(0);
});

// ==========================================================
// START SERVER
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