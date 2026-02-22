/*
============================================================
   ZYVO ENTERPRISE DYNAMIC PRICING ENGINE
   Smart • Scalable • Marketplace Ready
============================================================
*/

const calculateDynamicPrice = ({
  hotel,
  checkInDate,
  checkOutDate,
  rooms = 1,
}) => {
  if (!hotel) throw new Error("Hotel data required");

  let pricePerNight = hotel.basePrice;

  const today = new Date();
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const nights =
    Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)) || 1;

  /* ==========================================================
     1️⃣ WEEKEND SURGE
  ========================================================== */
  const day = checkIn.getDay();
  if (day === 5 || day === 6) {
    pricePerNight *= hotel.weekendPriceMultiplier || 1.1;
  }

  /* ==========================================================
     2️⃣ OCCUPANCY BASED SURGE
  ========================================================== */
  const occupancy =
    ((hotel.totalRooms - hotel.availableRooms) /
      hotel.totalRooms) *
    100;

  if (occupancy > 80) {
    pricePerNight *= 1.35;
  } else if (occupancy > 60) {
    pricePerNight *= 1.2;
  } else if (occupancy < 30) {
    pricePerNight *= 0.85;
  }

  /* ==========================================================
     3️⃣ EARLY BOOKING DISCOUNT (15+ days before)
  ========================================================== */
  const daysBefore =
    Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24));

  if (daysBefore >= 15) {
    pricePerNight *= 0.9;
  }

  /* ==========================================================
     4️⃣ LAST MINUTE SURGE (Same day or next day)
  ========================================================== */
  if (daysBefore <= 1) {
    pricePerNight *= 1.25;
  }

  /* ==========================================================
     5️⃣ MANUAL SURGE MULTIPLIER (Admin Controlled)
  ========================================================== */
  if (hotel.surgeMultiplier) {
    pricePerNight *= hotel.surgeMultiplier;
  }

  /* ==========================================================
     6️⃣ FESTIVAL MULTIPLIER (Optional Field)
  ========================================================== */
  if (hotel.festivalMultiplier) {
    pricePerNight *= hotel.festivalMultiplier;
  }

  /* ==========================================================
     7️⃣ MINIMUM PRICE SAFETY
  ========================================================== */
  const minPrice = hotel.basePrice * 0.7;
  if (pricePerNight < minPrice) {
    pricePerNight = minPrice;
  }

  /* ==========================================================
     8️⃣ MAX PRICE CAP (Protect Brand)
  ========================================================== */
  const maxCap = hotel.basePrice * 2.5;
  if (pricePerNight > maxCap) {
    pricePerNight = maxCap;
  }

  pricePerNight = Math.round(pricePerNight);

  /* ==========================================================
     9️⃣ TOTAL CALCULATION
  ========================================================== */
  const subtotal = pricePerNight * nights * rooms;

  /* ==========================================================
     🔟 PLATFORM COMMISSION CALCULATION
  ========================================================== */
  const commissionPercent = hotel.commissionPercent || 15;
  const commissionAmount =
    (subtotal * commissionPercent) / 100;

  const ownerAmount = subtotal - commissionAmount;

  return {
    pricePerNight,
    nights,
    rooms,
    subtotal,
    commissionPercent,
    commissionAmount: Math.round(commissionAmount),
    ownerAmount: Math.round(ownerAmount),
    occupancy: Math.round(occupancy),
  };
};

module.exports = calculateDynamicPrice;