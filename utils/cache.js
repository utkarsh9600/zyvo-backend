const redis = require("redis");

let client;

if (process.env.REDIS_URL) {
  client = redis.createClient({
    url: process.env.REDIS_URL
  });

  client.on("error", (err) => {
    console.log("Redis Error:", err.message);
  });

  client.connect()
    .then(() => console.log("✅ Redis Connected"))
    .catch(() => console.log("⚠ Redis Not Connected (Running Without Cache)"));
} else {
  console.log("⚠ No REDIS_URL found. Running without Redis.");
}

module.exports = client;