const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    /* ==========================================================
       OWNER + APPROVAL + COMPLIANCE
    ========================================================== */

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true
    },

    kycVerified: {
      type: Boolean,
      default: false
    },

    gstNumber: String,

    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String
    },

    /* ==========================================================
       BASIC INFO
    ========================================================== */

    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    description: {
      type: String,
      required: true
    },

    city: {
      type: String,
      required: true,
      index: true
    },

    state: String,
    country: {
      type: String,
      default: "India"
    },

    address: {
      type: String,
      required: true
    },

    /* ==========================================================
       GEO LOCATION (PRODUCTION READY)
    ========================================================== */

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    },

    /* ==========================================================
       INVENTORY
    ========================================================== */

    totalRooms: {
      type: Number,
      required: true,
      min: 1
    },

    availableRooms: {
      type: Number,
      required: true,
      min: 0
    },

    blockedDates: [
      {
        from: Date,
        to: Date,
        reason: String
      }
    ],

    /* ==========================================================
       PRICING ENGINE
    ========================================================== */

    basePrice: {
      type: Number,
      required: true
    },

    commissionPercent: {
      type: Number,
      default: 15
    },

    weekendPriceMultiplier: {
      type: Number,
      default: 1.1
    },

    surgeMultiplier: {
      type: Number,
      default: 1
    },

    festivalMultiplier: {
      type: Number,
      default: 1
    },

    minPriceFloor: Number,
    maxPriceCap: Number,

    /* ==========================================================
       AMENITIES + MEDIA
    ========================================================== */

    amenities: [String],
    images: [String],
    coverImage: String,

    /* ==========================================================
       RATINGS
    ========================================================== */

    rating: {
      type: Number,
      default: 0,
      index: true
    },

    reviewCount: {
      type: Number,
      default: 0
    },

    /* ==========================================================
       PERFORMANCE ANALYTICS
    ========================================================== */

    totalBookings: {
      type: Number,
      default: 0
    },

    totalRevenue: {
      type: Number,
      default: 0
    },

    occupancyRate: {
      type: Number,
      default: 0
    },

    cancellationRate: {
      type: Number,
      default: 0
    },

    repeatCustomerRate: {
      type: Number,
      default: 0
    },

    rankingScore: {
      type: Number,
      default: 0,
      index: true
    },

    /* ==========================================================
       STATUS CONTROL
    ========================================================== */

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);


/* ==========================================================
   INDEXES
========================================================== */

hotelSchema.index({ location: "2dsphere" });
hotelSchema.index({ city: 1, rankingScore: -1 });
hotelSchema.index({ basePrice: 1 });


/* ==========================================================
   AUTO SLUG GENERATION
========================================================== */

hotelSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now();
  }
  next();
});


/* ==========================================================
   OCCUPANCY CALCULATION
========================================================== */

hotelSchema.methods.updateOccupancy = function () {
  const booked = this.totalRooms - this.availableRooms;
  this.occupancyRate = Math.round(
    (booked / this.totalRooms) * 100
  );
};


/* ==========================================================
   SMART RANKING ALGORITHM
========================================================== */

hotelSchema.methods.updateRankingScore = function () {
  this.rankingScore =
    this.rating * 30 +
    this.occupancyRate * 0.5 +
    this.repeatCustomerRate * 20 -
    this.cancellationRate * 10;
};


/* ==========================================================
   SAFE EXPORT (Prevents OverwriteModelError)
========================================================== */

module.exports =
  mongoose.models.Hotel ||
  mongoose.model("Hotel", hotelSchema);