import mongoose from "mongoose";

const queueEntrySchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      default: ""
    },
    sector: {
      type: String,
      enum: ["hospital", "bank", "government"],
      required: true,
      index: true
    },
    branchName: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["waiting", "serving", "done"],
      default: "waiting",
      index: true
    },
    predictedWaitMinutes: {
      type: Number,
      default: 0
    },
    estimatedServiceMinutes: {
      type: Number,
      default: 8
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    servedAt: Date,
    completedAt: Date
  },
  { timestamps: true }
);

export const QueueEntry = mongoose.model("QueueEntry", queueEntrySchema);
