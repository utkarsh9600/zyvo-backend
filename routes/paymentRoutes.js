const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const auth = require("../middleware/auth");
const Booking = require("../models/Booking");

/*
=========================================================
ZYVO ROOMS – ENTERPRISE PAYMENT ROUTES (FINAL STABLE)
Crash Safe • Razorpay Compliant • Receipt Safe • Clean
=========================================================
*/


// ======================================================
// CREATE ORDER
// POST /api/payments/create-order/:bookingId
// ======================================================
router.post("/create-order/:bookingId", auth, async (req, res) => {
  try {
    const razorpay = req.app.locals.razorpay;

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured",
      });
    }

    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Owner check
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment attempt",
      });
    }

    // Cancelled check
    if (booking.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot pay for cancelled booking",
      });
    }

    // Already paid check
    if (booking.payment?.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Booking already paid",
      });
    }

    // Amount validation
    const amount = Number(booking.totalAmount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount",
      });
    }

    // 🔥 SAFE RECEIPT (ALWAYS < 40 chars)
    const receipt = `rcpt_${booking._id.toString().slice(-10)}`;

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receipt,
    };

    const order = await razorpay.orders.create(options);

    // Ensure payment object exists
    if (!booking.payment) booking.payment = {};

    booking.payment.razorpayOrderId = order.id;
    booking.payment.status = "PENDING";

    await booking.save();

    return res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error?.error || error);

    return res.status(500).json({
      success: false,
      message: error?.error?.description || "Failed to create payment order",
    });
  }
});



// ======================================================
// VERIFY PAYMENT
// POST /api/payments/verify
// ======================================================
router.post("/verify", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment data missing",
      });
    }

    // Signature verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const booking = await Booking.findOne({
      "payment.razorpayOrderId": razorpay_order_id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Owner safety check
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized verification attempt",
      });
    }

    // Already verified
    if (booking.payment?.status === "PAID") {
      return res.json({
        success: true,
        message: "Payment already verified",
      });
    }

    // Safe update
    booking.payment.status = "PAID";
    booking.payment.razorpayPaymentId = razorpay_payment_id;
    booking.payment.razorpaySignature = razorpay_signature;
    booking.payment.paidAt = new Date();

    booking.status = "CONFIRMED";

    await booking.save();

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });

  } catch (error) {
    console.error("VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
});

// ======================================================
// RAZORPAY WEBHOOK (PRODUCTION SAFE)
// POST /api/payments/webhook
// ======================================================
router.post(
  "/webhook",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
  async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];

      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest("hex");

      if (signature !== expected) {
        return res.status(400).send("Invalid signature");
      }

      const event = req.body;

      if (event.event === "payment.captured") {
        const payment = event.payload.payment.entity;

        const booking = await Booking.findOne({
          "payment.razorpayOrderId": payment.order_id,
        });

        if (booking) {
          booking.payment.status = "PAID";
          booking.payment.razorpayPaymentId = payment.id;
          booking.payment.paidAt = new Date();
          booking.status = "CONFIRMED";

          await booking.save();
        }
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);
module.exports = router;