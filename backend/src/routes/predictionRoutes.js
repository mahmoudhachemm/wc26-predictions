import express from "express";
import Fixture from "../models/Fixture.js";
import Prediction from "../models/Prediction.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

router.get("/mine", protect, async (req, res) => {
  const predictions = await Prediction.find({ user: req.user._id })
    .populate("user", "fullName email role")
    .sort({ createdAt: 1 });

  return res.json(predictions);
});

router.get("/all", protect, adminOnly, async (req, res) => {
  const { round, fixtureId, userId } = req.query;

  const filter = {};

  if (round) filter.gameweek = round;
  if (fixtureId) filter.fixture = fixtureId;
  if (userId) filter.user = userId;

  const predictions = await Prediction.find(filter)
    .populate("user", "fullName email role")
    .sort({ gameweek: 1, createdAt: 1 });

  return res.json(predictions);
});

router.get("/public", protect, async (req, res) => {
  const { round, fixtureId, userId } = req.query;

  const fixturesFilter = {
    $or: [{ isLocked: true }, { status: "finished" }],
  };

  if (round) fixturesFilter.gameweek = round;
  if (fixtureId) fixturesFilter._id = fixtureId;

  const visibleFixtures = await Fixture.find(fixturesFilter).select("_id");
  const visibleFixtureIds = visibleFixtures.map((fixture) => fixture._id);

  const predictionFilter = {
    fixture: { $in: visibleFixtureIds },
  };

  if (userId) predictionFilter.user = userId;

  const predictions = await Prediction.find(predictionFilter)
    .populate("user", "fullName email role")
    .sort({ gameweek: 1, createdAt: 1 });

  return res.json(predictions);
});

router.post("/save-round", protect, async (req, res) => {
  const { gameweek, predictions } = req.body;

  if (!gameweek) {
    return res.status(400).json({ message: "Round is required" });
  }

  if (!Array.isArray(predictions)) {
    return res.status(400).json({ message: "Predictions array is required" });
  }

  const openFixtures = await Fixture.find({
    gameweek,
    isLocked: false,
    status: { $ne: "finished" },
  }).sort({ createdAt: 1 });

  if (openFixtures.length === 0) {
    return res.status(400).json({ message: "No unlocked matches in this round" });
  }

  if (predictions.length !== openFixtures.length) {
    return res.status(400).json({
      message: "You must predict all unlocked games in the selected round",
    });
  }

  const openFixtureIds = new Set(
    openFixtures.map((fixture) => fixture._id.toString())
  );

  const fixtureMap = new Map(
    openFixtures.map((fixture) => [fixture._id.toString(), fixture])
  );

  const uniqueFixtureIds = new Set();
  let jokerCount = 0;

  for (const prediction of predictions) {
    const fixtureId = prediction.fixtureId;
    const predictedScoreA = Number(prediction.predictedScoreA);
    const predictedScoreB = Number(prediction.predictedScoreB);

    if (!openFixtureIds.has(fixtureId)) {
      return res.status(400).json({
        message: "Prediction includes a locked or invalid fixture",
      });
    }

    if (uniqueFixtureIds.has(fixtureId)) {
      return res.status(400).json({
        message: "Duplicate fixture prediction found",
      });
    }

    if (!isValidScore(predictedScoreA) || !isValidScore(predictedScoreB)) {
      return res.status(400).json({
        message: "Scores must be numbers from 0 to 20",
      });
    }

    uniqueFixtureIds.add(fixtureId);

    if (prediction.isJoker) {
      jokerCount += 1;
    }
  }

  if (jokerCount !== 1) {
    return res.status(400).json({
      message: "Choose exactly one joker for this round",
    });
  }

  const savedPredictions = [];

  for (const prediction of predictions) {
    const fixture = fixtureMap.get(prediction.fixtureId);

    const savedPrediction = await Prediction.findOneAndUpdate(
      {
        user: req.user._id,
        fixture: fixture._id,
      },
      {
        user: req.user._id,
        fixture: fixture._id,
        gameweek: fixture.gameweek,
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        predictedScoreA: Number(prediction.predictedScoreA),
        predictedScoreB: Number(prediction.predictedScoreB),
        isJoker: Boolean(prediction.isJoker),
        fixtureStatus: fixture.status,
        actualScoreA: fixture.actualScoreA,
        actualScoreB: fixture.actualScoreB,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("user", "fullName email role");

    savedPredictions.push(savedPrediction);
  }

  return res.json(savedPredictions);
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  const prediction = await Prediction.findById(req.params.id);

  if (!prediction) {
    return res.status(404).json({ message: "Prediction not found" });
  }

  await prediction.deleteOne();

  return res.json({ message: "Prediction deleted" });
});

export default router;