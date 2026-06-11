import express from "express";
import Fixture from "../models/Fixture.js";
import Prediction from "../models/Prediction.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { calculatePoints } from "../utils/calculatePoints.js";

const router = express.Router();

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

function applyChipPoints(prediction, basePoints) {
  if (prediction.specialChip === "triple_joker" && prediction.isJoker) {
    return basePoints * 3;
  }

  if (prediction.specialChip === "double_jokers" && prediction.isJoker) {
    return basePoints * 2;
  }

  if (
    (!prediction.specialChip || prediction.specialChip === "none") &&
    prediction.isJoker
  ) {
    return basePoints * 2;
  }

  return basePoints;
}

async function recalculateMaximumJokers(gameweek) {
  const maxChipPredictions = await Prediction.find({
    gameweek,
    specialChip: "maximum_joker",
    fixtureStatus: "finished",
  });

  const userIds = [
    ...new Set(
      maxChipPredictions.map((prediction) => prediction.user.toString())
    ),
  ];

  for (const userId of userIds) {
    const userRoundPredictions = await Prediction.find({
      user: userId,
      gameweek,
      specialChip: "maximum_joker",
      fixtureStatus: "finished",
    });

    if (userRoundPredictions.length === 0) continue;

    let bestPrediction = userRoundPredictions[0];

    for (const prediction of userRoundPredictions) {
      if (
        Number(prediction.basePoints || 0) >
        Number(bestPrediction.basePoints || 0)
      ) {
        bestPrediction = prediction;
      }
    }

    for (const prediction of userRoundPredictions) {
      const isBest =
        prediction._id.toString() === bestPrediction._id.toString();

      prediction.isAutoMaxJoker = isBest;
      prediction.isJoker = false;

      // General leaderboard points only.
      // Maximum Joker chip does not affect cup H2H.
      prediction.points = isBest
        ? Number(prediction.basePoints || 0) * 2
        : Number(prediction.basePoints || 0);

      await prediction.save();
    }
  }
}

router.patch("/:fixtureId", protect, adminOnly, async (req, res) => {
  const actualScoreA = Number(req.body.actualScoreA);
  const actualScoreB = Number(req.body.actualScoreB);

  if (!isValidScore(actualScoreA) || !isValidScore(actualScoreB)) {
    return res.status(400).json({
      message: "Actual scores must be numbers from 0 to 20",
    });
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

    // Cup H2H scoring.
    // Chips do NOT count here.
    // Only Main Cup Joker doubles the base points.
    prediction.cupBasePoints = basePoints;
    prediction.cupPoints = prediction.isCupJoker ? basePoints * 2 : basePoints;

    prediction.fixtureStatus = "finished";
    prediction.actualScoreA = actualScoreA;
    prediction.actualScoreB = actualScoreB;
    prediction.isAutoMaxJoker = false;

    // General leaderboard scoring.
    // Chips count here.
    if (prediction.specialChip === "maximum_joker") {
      prediction.isJoker = false;
      prediction.points = basePoints;
    } else {
      prediction.points = applyChipPoints(prediction, basePoints);
    }

    await prediction.save();
  }

  await recalculateMaximumJokers(fixture.gameweek);

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

  const gameweek = fixture.gameweek;

  fixture.actualScoreA = null;
  fixture.actualScoreB = null;
  fixture.status = "upcoming";

  await fixture.save();

  await Prediction.updateMany(
    { fixture: fixture._id },
    {
      basePoints: 0,
      points: 0,
      cupBasePoints: 0,
      cupPoints: 0,
      fixtureStatus: "upcoming",
      actualScoreA: null,
      actualScoreB: null,
      isAutoMaxJoker: false,
    }
  );

  await recalculateMaximumJokers(gameweek);

  return res.json({ message: "Result reset", fixture });
});

export default router;