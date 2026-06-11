import mongoose from "mongoose";

const cupMatchSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      default: "Group Stage",
    },
    gameweek: {
      type: String,
      required: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    matchNumber: {
      type: Number,
      required: true,
    },
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cupScoreA: {
      type: Number,
      default: 0,
    },
    cupScoreB: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminWinner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    needsAdminDecision: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CupMatch", cupMatchSchema);