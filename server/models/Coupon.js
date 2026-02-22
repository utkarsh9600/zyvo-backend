// ==========================================================
// ZYVO ROOMS – USER MODEL (ENTERPRISE PRODUCTION)
// Secure • Scalable • Role Based • Wallet Ready
// ==========================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */

    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never return password by default
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    /* ================= ROLE SYSTEM ================= */

    role: {
      type: String,
      enum: ["USER", "ADMIN", "HOTEL_OWNER"],
      default: "USER",
      index: true,
    },

    /* ================= ACCOUNT STATUS ================= */

    isVerified: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* ================= OTP / SECURITY ================= */

    otp: {
      code: String,
      expiresAt: Date,
    },

    passwordResetToken: String,
    passwordResetExpires: Date,

    /* ================= WALLET SYSTEM ================= */

    wallet: {
      balance: {
        type: Number,
        default: 0,
      },
    },

    /* ================= REFERRAL SYSTEM ================= */

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /* ================= META ================= */

    lastLogin: Date,

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

/* ================= PASSWORD HASHING ================= */

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

/* ================= PASSWORD COMPARE METHOD ================= */

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/* ================= SAFE JSON RESPONSE ================= */

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

/* ================= EXPORT ================= */

module.exports = mongoose.model("User", userSchema);