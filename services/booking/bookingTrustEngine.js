/**
 * =========================================================
 *  BOOKING TRUST ENGINE – Unicorn Level
 *  Purpose:
 *    - Fraud Detection
 *    - Risk Scoring
 *    - Velocity Checks
 *    - Booking Abuse Prevention
 * =========================================================
 */

const Booking = require("../../models/Booking");

const TRUST_CONFIG = {
  MAX_BOOKINGS_PER_HOUR: 5,
  MAX_BOOKINGS_PER_DAY: 15,
  HIGH_AMOUNT_THRESHOLD: 50000,
  HIGH_RISK_SCORE_BLOCK: 80,
  SUSPICIOUS_IP_REPEAT_LIMIT: 10,
};

class BookingTrustEngine {
  constructor() {}

  /* =========================================================
     PUBLIC METHOD – EVALUATE TRUST
  ========================================================= */
  async evaluate({ userId, amount, ip, userAgent }) {
    let score = 0;
    let reasons = [];

    /* ---------- 1. Velocity Check (Hour) ---------- */
    const hourlyBookings = await this.getBookingsInLastHour(userId);
    if (hourlyBookings >= TRUST_CONFIG.MAX_BOOKINGS_PER_HOUR) {
      score += 25;
      reasons.push("Too many bookings in 1 hour");
    }

    /* ---------- 2. Velocity Check (Day) ---------- */
    const dailyBookings = await this.getBookingsInLastDay(userId);
    if (dailyBookings >= TRUST_CONFIG.MAX_BOOKINGS_PER_DAY) {
      score += 20;
      reasons.push("Too many bookings in 24 hours");
    }

    /* ---------- 3. High Amount Booking ---------- */
    if (amount >= TRUST_CONFIG.HIGH_AMOUNT_THRESHOLD) {
      score += 15;
      reasons.push("High value booking");
    }

    /* ---------- 4. IP Abuse Check ---------- */
    const ipUsage = await this.getIPUsage(ip);
    if (ipUsage > TRUST_CONFIG.SUSPICIOUS_IP_REPEAT_LIMIT) {
      score += 30;
      reasons.push("Suspicious IP activity");
    }

    /* ---------- 5. Multiple Pending Bookings ---------- */
    const pendingCount = await this.getPendingBookings(userId);
    if (pendingCount > 3) {
      score += 20;
      reasons.push("Too many pending bookings");
    }

    /* ---------- 6. User History ---------- */
    const cancelRate = await this.getCancellationRate(userId);
    if (cancelRate > 0.5) {
      score += 20;
      reasons.push("High cancellation rate");
    }

    /* ---------- 7. User Agent Check ---------- */
    if (this.isBot(userAgent)) {
      score += 40;
      reasons.push("Bot-like behavior detected");
    }

    /* ---------- BLOCK DECISION ---------- */
    const blocked = score >= TRUST_CONFIG.HIGH_RISK_SCORE_BLOCK;

    return {
      score,
      blocked,
      reasons,
      riskLevel: this.getRiskLevel(score),
    };
  }

  /* =========================================================
     HELPER METHODS
  ========================================================= */

  async getBookingsInLastHour(userId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return Booking.countDocuments({
      user: userId,
      createdAt: { $gte: oneHourAgo },
    });
  }

  async getBookingsInLastDay(userId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return Booking.countDocuments({
      user: userId,
      createdAt: { $gte: oneDayAgo },
    });
  }

  async getPendingBookings(userId) {
    return Booking.countDocuments({
      user: userId,
      status: "PENDING_PAYMENT",
    });
  }

  async getIPUsage(ip) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return Booking.countDocuments({
      ipAddress: ip,
      createdAt: { $gte: oneHourAgo },
    });
  }

  async getCancellationRate(userId) {
    const total = await Booking.countDocuments({ user: userId });
    const cancelled = await Booking.countDocuments({
      user: userId,
      status: "CANCELLED",
    });

    if (total === 0) return 0;

    return cancelled / total;
  }

  isBot(userAgent) {
    if (!userAgent) return false;

    const botPatterns = [
      "bot",
      "spider",
      "crawler",
      "curl",
      "wget",
    ];

    return botPatterns.some((pattern) =>
      userAgent.toLowerCase().includes(pattern)
    );
  }

  getRiskLevel(score) {
    if (score < 20) return "LOW";
    if (score < 50) return "MEDIUM";
    if (score < 80) return "HIGH";
    return "CRITICAL";
  }
}

module.exports = new BookingTrustEngine();