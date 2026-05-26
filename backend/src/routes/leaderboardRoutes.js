import express from "express";
import User from "../models/User.js";
import Prediction from "../models/Prediction.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const { round } = req.query;

  const users = await User.find({ role: { $in: ["user", "admin"] } }).sort({ fullName: 1 });
  const predictions = await Prediction.find({ fixtureStatus: "finished" });

  const rows = users.map((user) => {
    const userPredictions = predictions.filter(
      (prediction) => prediction.user.toString() === user._id.toString()
    );

    const totalPoints = userPredictions.reduce(
      (sum, prediction) => sum + Number(prediction.points || 0),
      0
    );

    const currentRoundPoints = round
      ? userPredictions
          .filter((prediction) => prediction.gameweek === round)
          .reduce((sum, prediction) => sum + Number(prediction.points || 0), 0)
      : 0;

    return {
      userId: user._id.toString(),
      userName: user.fullName,
      email: user.email,
      role: user.role,
      currentRoundPoints,
      totalPoints,
    };
  });

  rows.sort((a, b) => b.totalPoints - a.totalPoints || b.currentRoundPoints - a.currentRoundPoints);

  return res.json(rows);
});

export default router;
