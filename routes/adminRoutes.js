const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const Ledger = require("../models/Ledger");
const User = require("../models/User");

const router = express.Router();

/* ================= ADMIN STATS ================= */

router.get("/stats", auth, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalHotels = await Hotel.countDocuments();
    const totalBookings = await Booking.countDocuments();

    const revenue = await Booking.aggregate([
      { $match: { paymentStatus: "PAID" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalCommission: { $sum: "$commissionAmount" }
        }
      }
    ]);

    res.json({
      success: true,
      totalUsers,
      totalHotels,
      totalBookings,
      totalRevenue: revenue[0]?.totalRevenue || 0,
      totalCommission: revenue[0]?.totalCommission || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET ALL BOOKINGS ================= */

router.get("/bookings", auth, admin, async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("hotel", "name city")
    .sort({ createdAt: -1 });

  res.json({ success: true, bookings });
});

/* ================= GET ALL HOTELS ================= */

router.get("/hotels", auth, admin, async (req, res) => {
  const hotels = await Hotel.find();
  res.json({ success: true, hotels });
});

/* ================= LEDGER ================= */

router.get("/ledger", auth, admin, async (req, res) => {
  const ledger = await Ledger.find()
    .populate("hotel", "name city")
    .sort({ createdAt: -1 });

  res.json({ success: true, ledger });
});

/* ================= MARK PAYOUT ================= */

router.post("/ledger/payout/:id", auth, admin, async (req, res) => {
  const ledger = await Ledger.findById(req.params.id);

  if (!ledger) {
    return res.status(404).json({ success: false });
  }

  ledger.payoutStatus = "PAID";
  ledger.payoutDate = new Date();
  ledger.payoutReference = req.body.reference;

  await ledger.save();

  res.json({ success: true });
});

module.exports = router;