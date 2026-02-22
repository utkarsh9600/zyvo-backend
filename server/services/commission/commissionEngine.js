// server/services/commissionEngine.js

const {
  DEFAULT_COMMISSION_PERCENT,
} = require("../config/commission");

const calculateCommission = ({ totalPrice, commissionPercent }) => {
  const percent = commissionPercent ?? DEFAULT_COMMISSION_PERCENT;

  const commissionAmount = Math.round(
    (totalPrice * percent) / 100
  );

  const hotelPayout = totalPrice - commissionAmount;

  return {
    commissionPercent: percent,
    commissionAmount,
    hotelPayout,
  };
};

module.exports = { calculateCommission };