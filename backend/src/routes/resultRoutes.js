import express from "express";
import Fixture from "../models/Fixture.js";
import Prediction from "../models/Prediction.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { calculatePoints } from "../utils/calculatePoints.js";

const router = express.Router();

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

router.patch("/:fixtureId", protect, adminOnly, async (req, res) => {
  const actualScoreA = Number(req.body.actualScoreA);
  const actualScoreB = Number(req.body.actualScoreB);

  if (!isValidScore(actualScoreA) || !isValidScore(actualScoreB)) {
    return res.status(400).json({ message: "Actual scores must be numbers from 0 to 20" });
  }

  const fixture = await Fixture.findById(req.params.fixtureId);

  if (!fixture) {
    return res.status(404).json({ message: "Fixture not found" });
  }

  fixture.actualScoreA = actualScoreA;
  fixture.actualScoreB = actualScoreB;
  fixture.status = "finished";
  fixture.isLocked = true;
  await fixture.save();

  const predictions = await Prediction.find({ fixture: fixture._id });

  for (const prediction of predictions) {
    const basePoints = calculatePoints(
      prediction.predictedScoreA,
      prediction.predictedScoreB,
      actualScoreA,
      actualScoreB
    );

    prediction.basePoints = basePoints;
    prediction.points = prediction.isJoker ? basePoints * 2 : basePoints;
    prediction.fixtureStatus = "finished";
    prediction.actualScoreA = actualScoreA;
    prediction.actualScoreB = actualScoreB;
    await prediction.save();
  }

  return res.json({
    fixture,
    updatedPredictions: predictions.length,
  });
});

router.delete("/:fixtureId", protect, adminOnly, async (req, res) => {
  const fixture = await Fixture.findById(req.params.fixtureId);

  if (!fixture) {
    return res.status(404).json({ message: "Fixture not found" });
  }

  fixture.actualScoreA = null;
  fixture.actualScoreB = null;
  fixture.status = "upcoming";
  await fixture.save();

  await Prediction.updateMany(
    { fixture: fixture._id },
    {
      basePoints: 0,
      points: 0,
      fixtureStatus: "upcoming",
      actualScoreA: null,
      actualScoreB: null,
    }
  );

  return res.json({ message: "Result reset", fixture });
});

export default router;
