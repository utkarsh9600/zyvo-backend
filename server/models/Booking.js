// ==========================================================
// ZYVO ROOMS – BOOKING MODEL (ENTERPRISE SAFE)
// Scalable • Payment Safe • Overbooking Protected
// ==========================================================

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    /* ================= RELATIONS ================= */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },

    /* ================= DATES ================= */

    checkIn: {
      type: Date,
      required: true,
      index: true,
    },

    checkOut: {
      type: Date,
      required: true,
      index: true,
    },

    nights: {
      type: Number,
      min: 1,
    },

    /* ================= PRICING SNAPSHOT ================= */

    pricePerNight: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    commissionAmount: {
      type: Number,
      default: 0,
    },

    /* ================= BOOKING LIFECYCLE ================= */

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
      default: "PENDING",
      index: true,
    },

    /* ================= PAYMENT ================= */

    payment: {
      method: {
        type: String,
        enum: ["ONLINE", "COD"],
        default: "ONLINE",
      },

      status: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
        default: "PENDING",
        index: true,
      },

      razorpayOrderId: {
        type: String,
        index: true,
      },

      razorpayPaymentId: String,
      razorpaySignature: String,

      paidAt: Date,
      refundedAt: Date,
    },

    /* ================= META ================= */

    cancelledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

// Fast search for user bookings
bookingSchema.index({ user: 1, createdAt: -1 });

// Fast hotel availability lookup
bookingSchema.index({ hotel: 1, checkIn: 1, checkOut: 1 });

/* ================= PRE-SAVE LOGIC ================= */

bookingSchema.pre("save", function (next) {
  // Auto calculate nights
  if (this.checkIn && this.checkOut) {
    const diff =
      (new Date(this.checkOut) - new Date(this.checkIn)) /
      (1000 * 60 * 60 * 24);











































const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // ================= RELATIONS =================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true
    },

    // ================= STAY DETAILS =================
    checkIn: {
      type: Date,
      required: true
    },

    checkOut: {
      type: Date,
      required: true
    },

    guests: {
      type: Number,
      required: true,
      min: 1
    },

    roomsBooked: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },

    nights: {
      type: Number,
      required: true,
      min: 1
    },

    // ================= PRICING =================
    basePricePerNight: {
      type: Number,
      required: true
    },

    finalPricePerNight: {
      type: Number,
      required: true
    },

    subtotal: {
      type: Number,
      required: true
    },

    taxAmount: {
      type: Number,
      default: 0
    },

    couponDiscount: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      required: true
    },

    // ================= COMMISSION =================
    commissionPercent: {
      type: Number,
      required: true
    },

    commissionAmount: {
      type: Number,
      required: true
    },

    gatewayFee: {
      type: Number,
      default: 0
    },

    ownerPayoutAmount: {
      type: Number,
      required: true
    },

    // ================= PAYMENT =================
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true
    },

    paymentMethod: {
      type: String
    },

    razorpayOrderId: {
      type: String
    },

    razorpayPaymentId: {
      type: String
    },

    razorpaySignature: {
      type: String
    },

    refundId: {
      type: String
    },

    // ================= BOOKING STATUS =================
    status: {
      type: String,
      enum: [
        "LOCKED",
        "CONFIRMED",
        "CANCELLED",
        "EXPIRED",
        "COMPLETED"
      ],
      default: "LOCKED",
      index: true
    },

    lockExpiresAt: {
      type: Date,
      index: true
    },

    cancellationReason: {
      type: String
    },

    cancelledAt: {
      type: Date
    },

    completedAt: {
      type: Date
    },

    // ================= COUPON =================
    couponCode: {
      type: String
    },

    // ================= DISPUTE =================
    hasDispute: {
      type: Boolean,
      default: false
    },

    disputeStatus: {
      type: String,
      enum: ["NONE", "OPEN", "RESOLVED", "REJECTED"],
      default: "NONE"
    },

    // ================= ANALYTICS =================
    source: {
      type: String,
      enum: ["DIRECT", "REFERRAL", "ORGANIC", "ADMIN"],
      default: "DIRECT"
    }
  },
  {
    timestamps: true
  }
);



// ================= AUTO CALCULATE NIGHTS =================
bookingSchema.pre("validate", function (next) {
  if (this.checkIn && this.checkOut) {
    const diff =
      (new Date(this.checkOut) - new Date(this.checkIn)) /
      (1000 * 60 * 60 * 24);
    this.nights = Math.max(1, Math.ceil(diff));
  }
  next();
});



// ================= INDEXES FOR PERFORMANCE =================
bookingSchema.index({ hotel: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ lockExpiresAt: 1 });



module.exports = mongoose.model("Booking", bookingSchema);


















    this.nights = Math.max(Math.ceil(diff), 1);
  }

  next();
});

module.exports = mongoose.model("Booking", bookingSchema);