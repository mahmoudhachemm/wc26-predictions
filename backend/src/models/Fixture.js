import mongoose from "mongoose";

const fixtureSchema = new mongoose.Schema(
  {
    gameweek: {
      type: String,
      required: true,
      trim: true,
    },
    teamA: {
      type: String,
      required: true,
      trim: true,
    },
    teamB: {
      type: String,
      required: true,
      trim: true,
    },
    kickoffTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "finished"],
      default: "upcoming",
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    actualScoreA: {
      type: Number,
      default: null,
      min: 0,
      max: 20,
    },
    actualScoreB: {
      type: Number,
      default: null,
      min: 0,
      max: 20,
    },
  },
  { timestamps: true }
);

fixtureSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Fixture", fixtureSchema);
