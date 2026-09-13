import mongoose from "mongoose";

// One document per sector, e.g. { _id: "hospital", seq: 42 }.
// Incrementing via $inc in findOneAndUpdate is atomic at the document
// level in MongoDB, which is what makes token generation race-free
// under concurrent requests for the same sector.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model("Counter", counterSchema);
