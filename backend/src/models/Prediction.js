import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fixture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fixture",
      required: true,
    },

    gameweek: {
      type: String,
      required: true,
    },

    teamA: {
      type: String,
      required: true,
    },

    teamB: {
      type: String,
      required: true,
    },

    predictedScoreA: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },

    predictedScoreB: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },

    isJoker: {
      type: Boolean,
      default: false,
    },

    isCupJoker: {
      type: Boolean,
      default: false,
    },

    specialChip: {
      type: String,
      enum: ["none", "triple_joker", "double_jokers", "maximum_joker"],
      default: "none",
    },

    isAutoMaxJoker: {
      type: Boolean,
      default: false,
    },

    basePoints: {
      type: Number,
      default: 0,
    },

    points: {
      type: Number,
      default: 0,
    },

    cupBasePoints: {
      type: Number,
      default: 0,
    },

    cupPoints: {
      type: Number,
      default: 0,
    },

    fixtureStatus: {
      type: String,
      enum: ["upcoming", "finished"],
      default: "upcoming",
    },

    actualScoreA: {
      type: Number,
      default: null,
    },

    actualScoreB: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

predictionSchema.index({ user: 1, fixture: 1 }, { unique: true });

predictionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();

    ret.userId = ret.user?._id
      ? ret.user._id.toString()
      : ret.user?.toString();

    ret.userName = ret.user?.fullName || ret.userName;

    ret.fixtureId = ret.fixture?._id
      ? ret.fixture._id.toString()
      : ret.fixture?.toString();

    delete ret._id;
    delete ret.__v;

    return ret;
  },
});

export default mongoose.model("Prediction", predictionSchema);