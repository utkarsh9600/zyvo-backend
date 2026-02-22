const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

/*
==========================================================
   RELEASE EXPIRED LOCKED BOOKINGS
   - Finds bookings where:
     status = LOCKED
     lockExpiresAt < now
   - Restores hotel inventory
   - Marks booking as EXPIRED
==========================================================
*/

const releaseExpiredLocks = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    // Find expired locked bookings
    const expiredBookings = await Booking.find({
      status: "LOCKED",
      lockExpiresAt: { $lt: now },
    }).session(session);

    if (expiredBookings.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return;
    }

    for (const booking of expiredBookings) {
      // Restore inventory
      const hotel = await Hotel.findById(booking.hotel).session(session);

      if (hotel) {
        hotel.availableRooms += booking.roomsBooked;
        await hotel.save({ session });
      }

      // Update booking
      booking.status = "EXPIRED";
      booking.paymentStatus = "FAILED";
      booking.lockExpiresAt = null;

      await booking.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    console.log(`🔓 Released ${expiredBookings.length} expired bookings`);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Lock Cleaner Error:", error.message);
  }
};

module.exports = releaseExpiredLocks;