const express = require("express");
const crypto = require("crypto");

const Booking = require("../models/Booking");
const { confirmBooking } = require("../controllers/bookingController");

const router = express.Router();


/* ==========================================================
   VERIFY PAYMENT (FRONTEND CALL AFTER PAYMENT SUCCESS)
========================================================== */

router.post("/verify", async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    const booking = await Booking.findOne({ razorpayOrderId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (booking.paymentStatus === "PAID") {
      return res.json({ success: true, message: "Already verified" });
    }

    booking.paymentStatus = "PAID";
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature;

    await booking.save();

    await confirmBooking(booking._id, razorpayPaymentId);

    res.json({ success: true, message: "Payment verified successfully" });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ==========================================================
   RAZORPAY WEBHOOK (PRIMARY CONFIRMATION SOURCE)
========================================================== */

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === "payment.captured") {

      const razorpayPaymentId = event.payload.payment.entity.id;
      const razorpayOrderId = event.payload.payment.entity.order_id;

      const booking = await Booking.findOne({ razorpayOrderId });

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      // Idempotency protection
      if (booking.paymentStatus === "PAID") {
        return res.json({ success: true, message: "Already processed" });
      }

      booking.paymentStatus = "PAID";
      booking.razorpayPaymentId = razorpayPaymentId;
      booking.status = "CONFIRMED";
      booking.lockExpiresAt = null;

      await booking.save();

      await confirmBooking(booking._id, razorpayPaymentId);
    }

    if (event.event === "payment.failed") {
      const razorpayOrderId = event.payload.payment.entity.order_id;

      const booking = await Booking.findOne({ razorpayOrderId });

      if (booking && booking.status === "LOCKED") {
        booking.paymentStatus = "FAILED";
        booking.status = "EXPIRED";
        await booking.save();
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ success: false });
  }
});


/* ==========================================================
   ADMIN REFUND BOOKING
========================================================== */

router.post("/refund/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking || booking.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Refund not allowed"
      });
    }

    const razorpay = req.app.locals.razorpay;

    const refund = await razorpay.payments.refund(
      booking.razorpayPaymentId,
      {
        amount: booking.totalAmount * 100
      }
    );

    booking.paymentStatus = "REFUNDED";
    booking.refundId = refund.id;
    booking.status = "CANCELLED";

    await booking.save();

    res.json({ success: true, refund });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



module.exports = router;