/**
 * ============================================================
 *  STAYZA – UNICORN PRICE ENGINE
 *  Enterprise Dynamic Pricing System
 * ============================================================
 */

const DEFAULT_CONFIG = {
  BASE_TAX_PERCENT: 12,
  PLATFORM_FEE_PERCENT: 3,
  WEEKEND_SURGE: 1.15,
  HIGH_DEMAND_SURGE: 1.25,
  LOW_DEMAND_DISCOUNT: 0.9,
  FESTIVAL_SURGE: 1.4,
  LAST_MINUTE_SURGE: 1.2,
  EARLY_BIRD_DISCOUNT: 0.85,
  LOYALTY_DISCOUNT_PERCENT: 5,
  MAX_DISCOUNT_CAP: 40,
  ROUNDING_STRATEGY: "SMART"
};

class PriceEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /* ============================================================
     PUBLIC METHOD
  ============================================================ */

  calculateFinalPrice(input) {
    const {
      basePrice,
      nights,
      occupancyRate,
      demandLevel,
      isWeekend,
      isFestival,
      bookingDaysBefore,
      loyaltyTier,
      couponDiscountPercent = 0
    } = input;

    if (!basePrice || !nights) {
      throw new Error("Base price and nights required");
    }

    let price = basePrice * nights;

    price = this.applyDemandPricing(price, demandLevel);
    price = this.applyOccupancyMultiplier(price, occupancyRate);
    price = this.applyWeekendSurge(price, isWeekend);
    price = this.applyFestivalSurge(price, isFestival);
    price = this.applyTimeBasedAdjustment(price, bookingDaysBefore);
    price = this.applyLoyaltyDiscount(price, loyaltyTier);
    price = this.applyCoupon(price, couponDiscountPercent);

    const tax = this.calculateTax(price);
    const platformFee = this.calculatePlatformFee(price);

    const finalAmount = this.smartRound(price + tax + platformFee);

    return {
      baseAmount: basePrice * nights,
      adjustedAmount: price,
      tax,
      platformFee,
      finalAmount
    };
  }

  /* ============================================================
     DEMAND ENGINE
  ============================================================ */

  applyDemandPricing(price, demandLevel) {
    if (demandLevel === "HIGH") {
      return price * this.config.HIGH_DEMAND_SURGE;
    }
    if (demandLevel === "LOW") {
      return price * this.config.LOW_DEMAND_DISCOUNT;
    }
    return price;
  }

  applyOccupancyMultiplier(price, occupancyRate = 0) {
    if (occupancyRate > 85) return price * 1.2;
    if (occupancyRate > 60) return price * 1.1;
    if (occupancyRate < 30) return price * 0.9;
    return price;
  }

  applyWeekendSurge(price, isWeekend) {
    if (isWeekend) {
      return price * this.config.WEEKEND_SURGE;
    }
    return price;
  }

  applyFestivalSurge(price, isFestival) {
    if (isFestival) {
      return price * this.config.FESTIVAL_SURGE;
    }
    return price;
  }

  applyTimeBasedAdjustment(price, daysBefore) {
    if (daysBefore <= 1) {
      return price * this.config.LAST_MINUTE_SURGE;
    }
    if (daysBefore > 30) {
      return price * this.config.EARLY_BIRD_DISCOUNT;
    }
    return price;
  }

  applyLoyaltyDiscount(price, tier) {
    if (!tier) return price;

    const tierDiscount = {
      GOLD: 10,
      SILVER: 5,
      PLATINUM: 15
    };

    const percent = tierDiscount[tier] || 0;
    return price - (price * percent) / 100;
  }

  applyCoupon(price, couponPercent) {
    if (!couponPercent) return price;

    const capped = Math.min(couponPercent, this.config.MAX_DISCOUNT_CAP);
    return price - (price * capped) / 100;
  }

  /* ============================================================
     TAX & PLATFORM
  ============================================================ */

  calculateTax(price) {
    return (price * this.config.BASE_TAX_PERCENT) / 100;
  }

  calculatePlatformFee(price) {
    return (price * this.config.PLATFORM_FEE_PERCENT) / 100;
  }

  /* ============================================================
     SMART ROUNDING
  ============================================================ */

  smartRound(amount) {
    if (this.config.ROUNDING_STRATEGY === "SMART") {
      return Math.round(amount / 10) * 10 - 1;
    }
    return Math.round(amount);
  }

  /* ============================================================
     REFUND ENGINE
  ============================================================ */

  calculateRefund(finalAmount, hoursBeforeCheckin) {
    if (hoursBeforeCheckin > 72) return finalAmount;
    if (hoursBeforeCheckin > 24) return finalAmount * 0.5;
    return 0;
  }

  /* ============================================================
     COMMISSION CALCULATOR
  ============================================================ */

  calculateHotelPayout(adjustedAmount, commissionPercent = 15) {
    const commission = (adjustedAmount * commissionPercent) / 100;
    return {
      hotelReceives: adjustedAmount - commission,
      platformEarns: commission
    };
  }
}

module.exports = new PriceEngine();