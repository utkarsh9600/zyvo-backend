const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const auth = require("../middleware/auth");

// ================= CREATE BOOKING =================
router.post("/", auth, async (req, res) => {
  try {
    const { hotelId, checkIn, checkOut } = req.body;

    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "Missing booking details",
      });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    const nights =
      (new Date(checkOut) - new Date(checkIn)) /
      (1000 * 60 * 60 * 24);

    if (nights <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid dates",
      });
    }

    const totalAmount = nights * hotel.price;

    const booking = await Booking.create({
      user: req.user.id,
      hotel: hotelId,
      checkIn,
      checkOut,
      nights,
      totalAmount,
      status: "PENDING",
      payment: {
        method: "ONLINE",
        status: "PENDING",
      },
    });

    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Booking failed",
    });
  }
});

// ================= GET MY BOOKINGS =================
router.get("/my", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user.id,
    })
      .populate("hotel")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// ================= CANCEL BOOKING =================
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.payment.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel paid booking directly",
      });
    }

    booking.status = "CANCELLED";
    await booking.save();

    res.json({
      success: true,
      message: "Booking cancelled",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Cancellation failed",
    });
  }
});

module.exports = router;