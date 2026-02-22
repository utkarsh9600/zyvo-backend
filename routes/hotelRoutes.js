// ==========================================================
// ZYVO ROOMS – ENTERPRISE HOTEL ROUTES
// Production Safe • Search Ready • Admin Controlled
// ==========================================================

const express = require("express");
const mongoose = require("mongoose");
const Hotel = require("../models/Hotel");
const auth = require("../middleware/auth");

const router = express.Router();

/* ==========================================================
   GET ALL HOTELS
   GET /api/hotels
   Supports: search, city, minPrice, maxPrice, rating, page
========================================================== */

router.get("/", async (req, res) => {
  try {
    const {
      search,
      city,
      minPrice,
      maxPrice,
      rating,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Filter by city
    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const hotels = await Hotel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Hotel.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      hotels,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch hotels",
    });
  }
});

/* ==========================================================
   GET SINGLE HOTEL
   GET /api/hotels/:id
========================================================== */

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    res.json({
      success: true,
      hotel,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching hotel",
    });
  }
});

/* ==========================================================
   CREATE HOTEL (ADMIN ONLY)
   POST /api/hotels
========================================================== */

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const {
      name,
      city,
      address,
      price,
      totalRooms,
      amenities,
      images,
      rating,
    } = req.body;

    if (!name || !city || !price) {
      return res.status(400).json({
        success: false,
        message: "Name, city and price are required",
      });
    }

    const hotel = await Hotel.create({
      name,
      city,
      address,
      price,
      totalRooms: totalRooms || 10,
      bookedRooms: 0,
      isAvailable: true,
      amenities: amenities || [],
      images: images || [],
      rating: rating || 4.0,
    });

    res.status(201).json({
      success: true,
      hotel,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create hotel",
    });
  }
});

/* ==========================================================
   UPDATE HOTEL (ADMIN)
   PUT /api/hotels/:id
========================================================== */

router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    res.json({
      success: true,
      hotel,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update hotel",
    });
  }
});

/* ==========================================================
   DELETE HOTEL (ADMIN)
   DELETE /api/hotels/:id
========================================================== */

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findByIdAndDelete(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    res.json({
      success: true,
      message: "Hotel deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to delete hotel",
    });
  }
});

module.exports = router;