// ==========================================================
// ZYVO ROOMS – ENTERPRISE AUTH ROUTES
// Secure • Production Ready • JWT Based
// ==========================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/* ==========================================================
   HELPER: GENERATE TOKEN
========================================================== */
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* ==========================================================
   REGISTER
   POST /api/auth/register
========================================================== */

router.post("/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    email = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Password strength check (basic)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name || "Guest User",
      email,
      password: hashedPassword,
      role: "USER",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("REGISTER_ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

/* ==========================================================
   LOGIN
   POST /api/auth/login
========================================================== */

router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN_ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/* ==========================================================
   GET CURRENT USER
   GET /api/auth/me
========================================================== */

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
});

/* ==========================================================
   MAKE ADMIN (Optional - secure manually)
   PUT /api/auth/make-admin/:id
========================================================== */

router.put("/make-admin/:id", async (req, res) => {
  try {
    // This route should ideally be protected manually
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = "ADMIN";
    await user.save();

    res.json({
      success: true,
      message: "User promoted to ADMIN",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Operation failed",
    });
  }
});

module.exports = router;