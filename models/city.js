import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: String,
  country: { type: String, default: "India" },
  popular: { type: Boolean, default: false }
});

export default mongoose.model("City", citySchema);