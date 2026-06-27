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
      default: "",
    },

    knockoutRound: {
      type: String,
      default: "",
    },

    matchNumber: {
      type: Number,
      required: true,
    },

    cupBracketMatchNumber: {
      type: Number,
      default: null,
    },

    bracketSlotA: {
      type: String,
      default: "",
    },

    bracketSlotB: {
      type: String,
      default: "",
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

    sourceMatchA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CupMatch",
      default: null,
    },

    sourceMatchB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CupMatch",
      default: null,
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