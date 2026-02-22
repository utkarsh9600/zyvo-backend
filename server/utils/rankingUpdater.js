const Hotel = require("../models/Hotel");

module.exports = async function updateRankingScores() {
  const hotels = await Hotel.find({
    isActive: true,
    approvalStatus: "APPROVED"
  });

  for (const hotel of hotels) {
    hotel.updateRankingScore();
    await hotel.save();
  }

  console.log("✅ Ranking scores updated");
};