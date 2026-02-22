// ==========================================================
// ZYVO ROOMS – ENTERPRISE REVIEW ROUTES
// Production Ready • Secure • Scalable
// ==========================================================

const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");

const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

const router = express.Router();

/* ==========================================================
   HELPER: UPDATE HOTEL RATING
========================================================== */

const updateHotelRating = async (hotelId) => {
  const stats = await Review.aggregate([
    { $match: { hotel: new mongoose.Types.ObjectId(hotelId) } },
    {
      $group: {
        _id: "$hotel",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return;

  if (stats.length > 0) {
    hotel.rating = Number(stats[0].avgRating.toFixed(1));
    hotel.reviewCount = stats[0].count;
  } else {
    hotel.rating = 0;
    hotel.reviewCount = 0;
  }

  await hotel.save();
};

/* ==========================================================
   ADD REVIEW
   POST /api/reviews
========================================================== */

router.post("/", auth, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and rating required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!["CONFIRMED", "COMPLETED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Only completed bookings can be reviewed",
      });
    }

    // Prevent duplicate review
    const existingReview = await Review.findOne({
      booking: bookingId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Review already submitted for this booking",
      });
    }

    const review = await Review.create({
      user: req.user.id,
      hotel: booking.hotel,
      booking: bookingId,
      rating,
      comment,
    });

    await updateHotelRating(booking.hotel);

    res.status(201).json({
      success: true,
      message: "Review submitted",
      review,
    });
  } catch (error) {
    console.error("REVIEW_CREATE_ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit review",
    });
  }
});

/* ==========================================================
   GET HOTEL REVIEWS
   GET /api/reviews/:hotelId
========================================================== */

router.get("/:hotelId", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = 5;

    const reviews = await Review.find({ hotel: hotelId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments({ hotel: hotelId });

    res.json({
      success: true,
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
});

/* ==========================================================
   UPDATE REVIEW
   PUT /api/reviews/:id
========================================================== */

router.put("/:id", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    await updateHotelRating(review.hotel);

    res.json({
      success: true,
      message: "Review updated",
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update review",
    });
  }
});

/* ==========================================================
   DELETE REVIEW
   DELETE /api/reviews/:id
========================================================== */

router.delete("/:id", auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (
      review.user.toString() !== req.user.id &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const hotelId = review.hotel;

    await review.deleteOne();

    await updateHotelRating(hotelId);

    res.json({
      success: true,
      message: "Review deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
});

module.exports = router;