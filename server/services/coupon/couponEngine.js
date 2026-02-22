/**
 * ============================================================
 * STAYZA – UNICORN COUPON ENGINE
 * Enterprise Grade Coupon System
 * ============================================================
 */

const DAY = 24 * 60 * 60 * 1000;

class CouponEngine {
  constructor() {
    this.maxStackAllowed = false;
  }

  /* ============================================================
     MAIN APPLY METHOD
  ============================================================ */

  applyCoupon({ coupon, booking, user }) {
    if (!coupon) {
      return this.error("Coupon not found");
    }

    if (!this.isActive(coupon)) {
      return this.error("Coupon expired or inactive");
    }

    if (!this.isValidDate(coupon)) {
      return this.error("Coupon expired");
    }

    if (!this.validateMinBooking(coupon, booking)) {
      return this.error(`Minimum booking amount ₹${coupon.minAmount} required`);
    }

    if (!this.validateUsageLimit(coupon)) {
      return this.error("Coupon usage limit exceeded");
    }

    if (!this.validateUserLimit(coupon, user)) {
      return this.error("You already used this coupon");
    }

    if (!this.validateHotelRestriction(coupon, booking)) {
      return this.error("Coupon not valid for this hotel");
    }

    if (!this.validateCityRestriction(coupon, booking)) {
      return this.error("Coupon not valid for this city");
    }

    if (!this.validateFirstBooking(coupon, user)) {
      return this.error("Valid only for first booking");
    }

    const discount = this.calculateDiscount(coupon, booking.amount);

    return {
      success: true,
      code: coupon.code,
      discountAmount: discount,
      finalAmount: Math.max(booking.amount - discount, 0),
      message: "Coupon applied successfully"
    };
  }

  /* ============================================================
     VALIDATIONS
  ============================================================ */

  isActive(coupon) {
    return coupon.isActive === true;
  }

  isValidDate(coupon) {
    const now = new Date();
    return now >= new Date(coupon.startDate) &&
           now <= new Date(coupon.expiryDate);
  }

  validateMinBooking(coupon, booking) {
    return booking.amount >= (coupon.minAmount || 0);
  }

  validateUsageLimit(coupon) {
    if (!coupon.maxUsage) return true;
    return coupon.usedCount < coupon.maxUsage;
  }

  validateUserLimit(coupon, user) {
    if (!coupon.maxUsagePerUser) return true;

    const usedByUser = user.usedCoupons?.filter(
      c => c === coupon.code
    ).length || 0;

    return usedByUser < coupon.maxUsagePerUser;
  }

  validateHotelRestriction(coupon, booking) {
    if (!coupon.validHotels || coupon.validHotels.length === 0) return true;
    return coupon.validHotels.includes(booking.hotelId);
  }

  validateCityRestriction(coupon, booking) {
    if (!coupon.validCities || coupon.validCities.length === 0) return true;
    return coupon.validCities.includes(booking.city);
  }

  validateFirstBooking(coupon, user) {
    if (!coupon.firstBookingOnly) return true;
    return user.totalBookings === 0;
  }

  /* ============================================================
     DISCOUNT CALCULATION
  ============================================================ */

  calculateDiscount(coupon, amount) {
    let discount = 0;

    switch (coupon.type) {
      case "PERCENT":
        discount = (amount * coupon.value) / 100;
        break;

      case "FLAT":
        discount = coupon.value;
        break;

      case "CASHBACK":
        discount = (amount * coupon.value) / 100;
        break;

      default:
        discount = 0;
    }

    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }

    return Math.round(discount);
  }

  /* ============================================================
     AUTO APPLY BEST COUPON
  ============================================================ */

  autoApplyBestCoupon({ coupons, booking, user }) {
    let best = null;

    for (const coupon of coupons) {
      const result = this.applyCoupon({ coupon, booking, user });

      if (result.success) {
        if (!best || result.discountAmount > best.discountAmount) {
          best = result;
        }
      }
    }

    return best || { success: false, message: "No applicable coupon" };
  }

  /* ============================================================
     SECURITY
  ============================================================ */

  preventStacking(appliedCoupons) {
    if (!this.maxStackAllowed && appliedCoupons.length > 1) {
      return this.error("Coupon stacking not allowed");
    }
    return { success: true };
  }

  /* ============================================================
     ERROR FORMAT
  ============================================================ */

  error(message) {
    return {
      success: false,
      message,
      discountAmount: 0
    };
  }
}

module.exports = new CouponEngine();