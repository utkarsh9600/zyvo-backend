const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const Ledger = require("../models/Ledger");

const calculateDynamicPrice = require("../services/pricingService");

/* ==========================================================
   1️⃣ CREATE BOOKING (LOCK + RAZORPAY ORDER)
========================================================== */

exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { hotelId, checkIn, checkOut, rooms = 1 } = req.body;
    const userId = req.user.id;

    // Fraud protection – limit bookings per day
    const todayBookings = await Booking.countDocuments({
      user: userId,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    if (todayBookings >= 5) {
      throw new Error("Daily booking limit exceeded");
    }

    const hotel = await Hotel.findById(hotelId).session(session);

    if (!hotel || !hotel.isActive)
      throw new Error("Hotel not available");

    if (hotel.availableRooms < rooms)
      throw new Error("Not enough rooms available");

    // Dynamic Pricing
    const pricing = calculateDynamicPrice({
      hotel,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      rooms
    });

    // Reduce inventory (LOCK)
    hotel.availableRooms -= rooms;
    hotel.updateOccupancy();
    await hotel.save({ session });

    const booking = await Booking.create([{
      user: userId,
      hotel: hotelId,
      checkIn,
      checkOut,
      roomsBooked: rooms,
      nights: pricing.nights,
      basePricePerNight: hotel.basePrice,
      finalPricePerNight: pricing.pricePerNight,
      subtotal: pricing.subtotal,
      totalAmount: pricing.subtotal,
      commissionPercent: pricing.commissionPercent,
      commissionAmount: pricing.commissionAmount,
      ownerPayoutAmount: pricing.ownerAmount,
      status: "LOCKED",
      paymentStatus: "PENDING",
      lockExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      booking: booking[0]
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: err.message });
  }
};


/* ==========================================================
   2️⃣ CONFIRM BOOKING (Webhook Safe)
========================================================== */

exports.confirmBooking = async (bookingId, paymentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId)
      .populate("hotel")
      .session(session);

    if (!booking || booking.status !== "LOCKED") {
      await session.abortTransaction();
      return;
    }

    booking.status = "CONFIRMED";
    booking.paymentStatus = "PAID";
    booking.razorpayPaymentId = paymentId;
    booking.lockExpiresAt = null;

    await booking.save({ session });

    // Update hotel analytics
    const hotel = booking.hotel;
    hotel.totalBookings += 1;
    hotel.totalRevenue += booking.totalAmount;
    hotel.updateOccupancy();

    await hotel.save({ session });

    // Ledger entry
    await Ledger.create([{
      hotel: hotel._id,
      booking: booking._id,
      totalAmount: booking.totalAmount,
      commissionAmount: booking.commissionAmount,
      gatewayFee: 0,
      ownerPayoutAmount: booking.ownerPayoutAmount
    }], { session });

    await session.commitTransaction();
    session.endSession();

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
  }
};


/* ==========================================================
   3️⃣ CANCEL BOOKING (USER SIDE)
========================================================== */

exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(req.params.id)
      .populate("hotel")
      .session(session);

    if (!booking)
      throw new Error("Booking not found");

    if (booking.user.toString() !== req.user.id)
      throw new Error("Unauthorized");

    if (booking.status !== "CONFIRMED")
      throw new Error("Cannot cancel this booking");

    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();

    const hotel = booking.hotel;
    hotel.availableRooms += booking.roomsBooked;
    hotel.updateOccupancy();

    await hotel.save({ session });
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: err.message });
  }
};


/* ==========================================================
   4️⃣ GET USER BOOKINGS
========================================================== */

exports.getMyBookings = async (req, res) => {
  const bookings = await Booking.find({
    user: req.user.id
  })
    .populate("hotel", "name city images")
    .sort({ createdAt: -1 });

  res.json({ success: true, bookings });
};


/* ==========================================================
   5️⃣ ADMIN – GET ALL BOOKINGS
========================================================== */

exports.getAllBookings = async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("hotel", "name city")
    .sort({ createdAt: -1 });

  res.json({ success: true, bookings });
};