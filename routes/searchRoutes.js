const express = require("express");
const Hotel = require("../models/Hotel");
const redisClient = require("../utils/cache");

const router = express.Router();

/* ==========================================================
   1️⃣ ADVANCED HOTEL SEARCH (WITH REDIS CACHE)
========================================================== */

router.get("/", async (req, res) => {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      rating,
      amenities,
      page = 1,
      limit = 10,
      sort = "ranking",
      availableOnly
    } = req.query;

    // 🔥 Unique Cache Key (based on full query)
    const cacheKey = `search:${JSON.stringify(req.query)}`;

    // ⚡ Check Cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("⚡ Cache Hit - Search");
      return res.json(JSON.parse(cachedData));
    }

    console.log("🐢 Cache Miss - Search");

    const query = {
      isActive: true,
      isDeleted: false,
      approvalStatus: "APPROVED"
    };

    if (city) query.city = new RegExp(city, "i");
    if (rating) query.rating = { $gte: Number(rating) };
    if (availableOnly === "true") query.availableRooms = { $gt: 0 };

    if (amenities) {
      const list = amenities.split(",");
      query.amenities = { $all: list };
    }

    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    let sortOption = {};
    if (sort === "priceLow") sortOption = { basePrice: 1 };
    else if (sort === "priceHigh") sortOption = { basePrice: -1 };
    else if (sort === "rating") sortOption = { rating: -1 };
    else sortOption = { rankingScore: -1 };

    const hotels = await Hotel.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Hotel.countDocuments(query);

    const response = {
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      hotels
    };

    // 🔥 Save Cache for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

    res.json(response);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


/* ==========================================================
   2️⃣ GEO NEARBY SEARCH (WITH CACHE)
========================================================== */

router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude required"
      });
    }

    const cacheKey = `nearby:${lat}:${lng}:${radius}:${limit}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("⚡ Cache Hit - Nearby");
      return res.json(JSON.parse(cachedData));
    }

    console.log("🐢 Cache Miss - Nearby");

    const hotels = await Hotel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)]
          },
          distanceField: "distance",
          maxDistance: Number(radius),
          spherical: true,
          query: {
            isActive: true,
            isDeleted: false,
            approvalStatus: "APPROVED"
          }
        }
      },
      { $sort: { rankingScore: -1 } },
      { $limit: Number(limit) }
    ]);

    const response = {
      success: true,
      count: hotels.length,
      hotels
    };

    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

    res.json(response);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


/* ==========================================================
   3️⃣ TRENDING HOTELS (WITH CACHE)
========================================================== */

router.get("/trending", async (req, res) => {
  try {

    const cacheKey = "trending_hotels";

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("⚡ Cache Hit - Trending");
      return res.json(JSON.parse(cachedData));
    }

    console.log("🐢 Cache Miss - Trending");

    const hotels = await Hotel.find({
      isActive: true,
      approvalStatus: "APPROVED"
    })
      .sort({ rankingScore: -1 })
      .limit(10);

    const response = {
      success: true,
      hotels
    };

    await redisClient.setEx(cacheKey, 120, JSON.stringify(response));

    res.json(response);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;