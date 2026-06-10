import express from "express";
import Fixture from "../models/Fixture.js";
import Prediction from "../models/Prediction.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

const ALLOWED_CHIPS = [
  "none",
  "triple_joker",
  "double_jokers",
  "maximum_joker",
];

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

function getFixtureId(prediction) {
  return prediction.fixture?._id?.toString() || prediction.fixture?.toString();
}

function sortPredictionsByFixtureOrder(predictions, fixtures) {
  const fixtureOrderMap = {};

  fixtures.forEach((fixture, index) => {
    fixtureOrderMap[fixture._id.toString()] = index;
  });

  return predictions.sort((a, b) => {
    const fixtureA = getFixtureId(a);
    const fixtureB = getFixtureId(b);

    return (
      (fixtureOrderMap[fixtureA] ?? 999999) -
      (fixtureOrderMap[fixtureB] ?? 999999)
    );
  });
}

router.get("/mine", protect, async (req, res) => {
  const predictions = await Prediction.find({ user: req.user._id })
    .populate("user", "fullName email role")
    .populate("fixture")
    .lean();

  const fixtures = await Fixture.find({}).sort({ createdAt: 1 }).lean();

  const orderedPredictions = sortPredictionsByFixtureOrder(
    predictions,
    fixtures
  );

  return res.json(orderedPredictions);
});

router.get("/all", protect, adminOnly, async (req, res) => {
  const { round, fixtureId, userId } = req.query;

  const filter = {};

  if (round) filter.gameweek = round;
  if (fixtureId) filter.fixture = fixtureId;
  if (userId) filter.user = userId;

  const predictions = await Prediction.find(filter)
    .populate("user", "fullName email role")
    .populate("fixture")
    .lean();

  const fixtureFilter = {};
  if (round) fixtureFilter.gameweek = round;
  if (fixtureId) fixtureFilter._id = fixtureId;

  const fixtures = await Fixture.find(fixtureFilter)
    .sort({ createdAt: 1 })
    .lean();

  const orderedPredictions = sortPredictionsByFixtureOrder(
    predictions,
    fixtures
  );

  return res.json(orderedPredictions);
});

router.get("/public", protect, async (req, res) => {
  const { round, fixtureId, userId } = req.query;

  const fixturesFilter = {
    $or: [{ isLocked: true }, { status: "finished" }],
  };

  if (round) fixturesFilter.gameweek = round;
  if (fixtureId) fixturesFilter._id = fixtureId;

  const visibleFixtures = await Fixture.find(fixturesFilter)
    .sort({ createdAt: 1 })
    .lean();

  const visibleFixtureIds = visibleFixtures.map((fixture) => fixture._id);

  const predictionFilter = {
    fixture: { $in: visibleFixtureIds },
  };

  if (userId) predictionFilter.user = userId;

  const predictions = await Prediction.find(predictionFilter)
    .populate("user", "fullName email role")
    .populate("fixture")
    .lean();

  const orderedPredictions = sortPredictionsByFixtureOrder(
    predictions,
    visibleFixtures
  );

  return res.json(orderedPredictions);
});

router.post("/save-round", protect, async (req, res) => {
  const { gameweek, predictions, specialChip = "none" } = req.body;

  if (!gameweek) {
    return res.status(400).json({ message: "Round is required" });
  }

  if (!Array.isArray(predictions)) {
    return res.status(400).json({ message: "Predictions array is required" });
  }

  if (!ALLOWED_CHIPS.includes(specialChip)) {
    return res.status(400).json({ message: "Invalid chip selected" });
  }

  const openFixtures = await Fixture.find({
    gameweek,
    isLocked: false,
    status: { $ne: "finished" },
  }).sort({ createdAt: 1 });

  if (openFixtures.length === 0) {
    return res
      .status(400)
      .json({ message: "No unlocked matches in this round" });
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

  if (specialChip === "double_jokers") {
    if (jokerCount !== 2) {
      return res.status(400).json({
        message: "Double Jokers chip requires exactly 2 jokers in this round",
      });
    }
  } else if (specialChip === "maximum_joker") {
    if (jokerCount !== 0) {
      return res.status(400).json({
        message:
          "Maximum Joker chip chooses the best game automatically, do not select a joker",
      });
    }
  } else {
    if (jokerCount !== 1) {
      return res.status(400).json({
        message: "Choose exactly one joker for this round",
      });
    }
  }

  if (specialChip !== "none") {
    const usedAnyChipInAnotherRound = await Prediction.findOne({
      user: req.user._id,
      specialChip: { $ne: "none" },
      gameweek: { $ne: gameweek },
    });

    if (usedAnyChipInAnotherRound) {
      return res.status(400).json({
        message: "You can use only one special chip in the whole tournament",
      });
    }
  }

  const operations = predictions.map((prediction) => {
    const fixture = fixtureMap.get(prediction.fixtureId);

    return {
      updateOne: {
        filter: {
          user: req.user._id,
          fixture: fixture._id,
        },
        update: {
          $set: {
            user: req.user._id,
            fixture: fixture._id,
            gameweek: fixture.gameweek,
            teamA: fixture.teamA,
            teamB: fixture.teamB,
            predictedScoreA: Number(prediction.predictedScoreA),
            predictedScoreB: Number(prediction.predictedScoreB),
            isJoker: Boolean(prediction.isJoker),
            specialChip,
            isAutoMaxJoker: false,
            fixtureStatus: fixture.status,
            actualScoreA: fixture.actualScoreA,
            actualScoreB: fixture.actualScoreB,
          },
        },
        upsert: true,
      },
    };
  });

  await Prediction.bulkWrite(operations);

  const savedPredictions = await Prediction.find({
    user: req.user._id,
    gameweek,
  })
    .populate("user", "fullName email role")
    .populate("fixture")
    .lean();

  const orderedSavedPredictions = sortPredictionsByFixtureOrder(
    savedPredictions,
    openFixtures
  );

  return res.json(orderedSavedPredictions);
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