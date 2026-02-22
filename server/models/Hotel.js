// ==========================================================
// ZYVO ROOMS – HOTEL MODEL (ENTERPRISE PRODUCTION)
// Scalable • Indexed • Booking Safe • Investor Ready
// ==========================================================

const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    /* ================= LOCATION ================= */

    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    state: {
      type: String,
      default: "India",
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (val) {
            return !val || val.length === 2;
          },
          message: "Coordinates must be [longitude, latitude]",
        },
      },
    },

    /* ================= PRICING ================= */

    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },

    dynamicPricingEnabled: {
      type: Boolean,
      default: false,
    },

    commissionPercent: {
      type: Number,
      default: 12,
      min: 0,
      max: 100,
    },

    /* ================= INVENTORY ================= */

    totalRooms: {
      type: Number,
      required: true,
      min: 1,
    },

    bookedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* ================= RATINGS ================= */

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ================= AMENITIES ================= */

    amenities: {
      type: [String],
      default: [],
    },

    /* ================= IMAGES ================= */

    images: {
      type: [String],
      default: [],
    },

    /* ================= FLAGS ================= */

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* ================= META ================= */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // IMPORTANT for production control
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

hotelSchema.index({ city: 1, price: 1 });
hotelSchema.index({ rating: -1 });
hotelSchema.index({ location: "2dsphere" });

/* ================= PRE-SAVE LOGIC ================= */

hotelSchema.pre("save", function (next) {
  if (this.bookedRooms > this.totalRooms) {
    this.bookedRooms = this.totalRooms;
  }

  this.isAvailable = this.bookedRooms < this.totalRooms;

  next();
});

/* ================= EXPORT ================= */

module.exports = mongoose.model("Hotel", hotelSchema);