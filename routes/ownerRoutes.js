const express = require("express");
const auth = require("../middleware/auth");

const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");
const Ledger = require("../models/ledger");

const router = express.Router();

/* ==========================================================
   1️⃣ OWNER DASHBOARD SUMMARY
========================================================== */

router.get("/dashboard", auth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const hotels = await Hotel.find({ owner: ownerId });

    const hotelIds = hotels.map(h => h._id);

    const totalBookings = await Booking.countDocuments({
      hotel: { $in: hotelIds },
      status: "CONFIRMED"
    });

    const revenueData = await Booking.aggregate([
      {
        $match: {
          hotel: { $in: hotelIds },
          paymentStatus: "PAID"
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalCommission: { $sum: "$commissionAmount" }
        }
      }
    ]);

    const ledgerData = await Ledger.aggregate([
      {
        $match: { hotel: { $in: hotelIds } }
      },
      {
        $group: {
          _id: "$payoutStatus",
          amount: { $sum: "$ownerPayoutAmount" }
        }
      }
    ]);

    const pending =
      ledgerData.find(l => l._id === "UNPAID")?.amount || 0;

    const paid =
      ledgerData.find(l => l._id === "PAID")?.amount || 0;

    res.json({
      success: true,
      totalHotels: hotels.length,
      totalBookings,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      totalCommission: revenueData[0]?.totalCommission || 0,
      pendingPayout: pending,
      paidPayout: paid
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/* ==========================================================
   2️⃣ GET OWNER HOTELS
========================================================== */

router.get("/hotels", auth, async (req, res) => {
  const hotels = await Hotel.find({ owner: req.user.id });
  res.json({ success: true, hotels });
});


/* ==========================================================
   3️⃣ UPDATE HOTEL PRICING
========================================================== */

router.put("/hotel/:id/pricing", auth, async (req, res) => {
  const hotel = await Hotel.findOne({
    _id: req.params.id,
    owner: req.user.id
  });

  if (!hotel)
    return res.status(404).json({ success: false });

  hotel.basePrice = req.body.basePrice ?? hotel.basePrice;
  hotel.weekendPriceMultiplier =
    req.body.weekendPriceMultiplier ??
    hotel.weekendPriceMultiplier;
  hotel.surgeMultiplier =
    req.body.surgeMultiplier ?? hotel.surgeMultiplier;

  await hotel.save();

  res.json({ success: true, message: "Pricing updated" });
});


/* ==========================================================
   4️⃣ BLOCK DATES
========================================================== */

router.post("/hotel/:id/block-dates", auth, async (req, res) => {
  const hotel = await Hotel.findOne({
    _id: req.params.id,
    owner: req.user.id
  });

  if (!hotel)
    return res.status(404).json({ success: false });

  hotel.blockedDates.push({
    from: req.body.from,
    to: req.body.to,
    reason: req.body.reason
  });

  await hotel.save();

  res.json({ success: true });
});


/* ==========================================================
   5️⃣ OWNER BOOKINGS
========================================================== */

router.get("/bookings", auth, async (req, res) => {
  const hotels = await Hotel.find({ owner: req.user.id });

  const hotelIds = hotels.map(h => h._id);

  const bookings = await Booking.find({
    hotel: { $in: hotelIds }
  })
    .populate("user", "name email")
    .populate("hotel", "name city")
    .sort({ createdAt: -1 });

  res.json({ success: true, bookings });
});


/* ==========================================================
   6️⃣ CANCEL BOOKING (OWNER SIDE)
========================================================== */

router.put("/booking/:id/cancel", auth, async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("hotel");

  if (!booking)
    return res.status(404).json({ success: false });

  if (booking.hotel.owner.toString() !== req.user.id)
    return res.status(403).json({ success: false });

  booking.status = "CANCELLED";
  booking.cancelledAt = new Date();

  booking.hotel.availableRooms += booking.roomsBooked;
  await booking.hotel.save();
  await booking.save();

  res.json({ success: true });
});


/* ==========================================================
   7️⃣ MONTHLY REVENUE CHART DATA
========================================================== */

router.get("/revenue/monthly", auth, async (req, res) => {
  const hotels = await Hotel.find({ owner: req.user.id });
  const hotelIds = hotels.map(h => h._id);

  const revenue = await Booking.aggregate([
    {
      $match: {
        hotel: { $in: hotelIds },
        paymentStatus: "PAID"
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        revenue: { $sum: "$totalAmount" }
      }
    }
  ]);

  res.json({ success: true, revenue });
});


module.exports = router;