import mongoose from "mongoose";

const cupMatchSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      required: true,
      enum: [
        "Group Stage",
        "Round of 32",
        "Round of 16",
        "Quarter Final",
        "Semi Final",
        "Final",
      ],
    },

    gameweek: {
      type: String,
      required: true,
    },

    groupName: {
      type: String,
      default: "",
    },

    matchNumber: {
      type: Number,
      required: true,
    },

    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

    isCompleted: {
      type: Boolean,
      default: false,
    },

    needsAdminDecision: {
      type: Boolean,
      default: false,
    },

    adminWinner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

cupMatchSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();

    ret.userAId = ret.userA?._id
      ? ret.userA._id.toString()
      : ret.userA
      ? ret.userA.toString()
      : null;

    ret.userBId = ret.userB?._id
      ? ret.userB._id.toString()
      : ret.userB
      ? ret.userB.toString()
      : null;

    ret.userAName = ret.userA?.fullName || "";
    ret.userBName = ret.userB?.fullName || "";

    ret.winnerId = ret.winner?._id
      ? ret.winner._id.toString()
      : ret.winner
      ? ret.winner.toString()
      : null;

    ret.winnerName = ret.winner?.fullName || "";

    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("CupMatch", cupMatchSchema);