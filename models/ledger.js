const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    totalAmount: {
      type: Number,
      required: true
    },

    commissionAmount: {
      type: Number,
      required: true
    },

    gatewayFee: {
      type: Number,
      required: true
    },

    ownerPayoutAmount: {
      type: Number,
      required: true
    },

    payoutStatus: {
      type: String,
      enum: ["UNPAID", "PAID"],
      default: "UNPAID",
      index: true
    },

    payoutDate: Date,
    payoutReference: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ledger", ledgerSchema);