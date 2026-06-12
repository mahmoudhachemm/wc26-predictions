import express from "express";
import Fixture from "../models/Fixture.js";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

const ALLOWED_CHIPS = [
  "none",
  "triple_joker",
  "double_jokers",
  "maximum_joker",
];

const CHIP_LABELS = {
  triple_joker: "Triple Joker",
  double_jokers: "Double Joker",
  maximum_joker: "Maximum Joker",
};

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

function normalizePrediction(prediction) {
  const item = prediction.toObject ? prediction.toObject() : prediction;

  const userObject = item.user;
  const fixtureObject = item.fixture;

  return {
    ...item,
    id: item._id?.toString() || item.id,
    userId: userObject?._id
      ? userObject._id.toString()
      : userObject
      ? userObject.toString()
      : item.userId,
    userName: userObject?.fullName || item.userName,
    fixtureId: fixtureObject?._id
      ? fixtureObject._id.toString()
      : fixtureObject
      ? fixtureObject.toString()
      : item.fixtureId,
  };
}

function getPredictionFixtureId(prediction) {
  return (
    prediction.fixtureId ||
    prediction.fixture?._id?.toString() ||
    prediction.fixture?.toString()
  );
}

function sortPredictionsByFixtureOrder(predictions, fixtures) {
  const fixtureOrderMap = {};

  fixtures.forEach((fixture, index) => {
    fixtureOrderMap[fixture._id.toString()] = index;
  });

  return predictions.sort((a, b) => {
    const fixtureA = getPredictionFixtureId(a);
    const fixtureB = getPredictionFixtureId(b);

    return (
      (fixtureOrderMap[fixtureA] ?? 999999) -
      (fixtureOrderMap[fixtureB] ?? 999999)
    );
  });
}

function inferChipFromRoundPredictions(roundPredictions) {
  const explicitChipPrediction = roundPredictions.find(
    (prediction) =>
      prediction.specialChip && prediction.specialChip !== "none"
  );

  if (explicitChipPrediction) {
    return explicitChipPrediction.specialChip;
  }

  const jokerCount = roundPredictions.filter(
    (prediction) => prediction.isJoker
  ).length;

  const hasAutoMax = roundPredictions.some(
    (prediction) => prediction.isAutoMaxJoker
  );

  if (hasAutoMax) return "maximum_joker";

  if (jokerCount === 2) return "double_jokers";

  return "none";
}

router.get("/mine", protect, async (req, res) => {
  const predictions = await Prediction.find({ user: req.user._id })
    .populate("user", "fullName email role")
    .populate("fixture");

  const fixtures = await Fixture.find({}).sort({ createdAt: 1 });

  const normalizedPredictions = predictions.map(normalizePrediction);

  const orderedPredictions = sortPredictionsByFixtureOrder(
    normalizedPredictions,
    fixtures
  );

  return res.json(orderedPredictions);
});

router.get("/chips", protect, async (req, res) => {
  const users = await User.find({ role: "user" }).sort({ fullName: 1 });

  const allPredictions = await Prediction.find({})
    .populate("user", "fullName email role")
    .populate("fixture")
    .sort({ gameweek: 1, createdAt: 1 });

  const predictionsByUserAndRound = new Map();

  allPredictions.forEach((prediction) => {
    if (!prediction.user || prediction.user.role !== "user") return;
    if (!prediction.gameweek) return;

    const userId = prediction.user._id.toString();
    const key = `${userId}___${prediction.gameweek}`;

    if (!predictionsByUserAndRound.has(key)) {
      predictionsByUserAndRound.set(key, {
        userId,
        gameweek: prediction.gameweek,
        predictions: [],
      });
    }

    predictionsByUserAndRound.get(key).predictions.push(prediction);
  });

  const usedByUser = new Map();

  predictionsByUserAndRound.forEach((group) => {
    const chip = inferChipFromRoundPredictions(group.predictions);

    if (!chip || chip === "none") return;

    if (!usedByUser.has(group.userId)) {
      usedByUser.set(group.userId, new Map());
    }

    const userChipMap = usedByUser.get(group.userId);

    if (!userChipMap.has(chip)) {
      userChipMap.set(chip, {
        chip,
        label: CHIP_LABELS[chip] || chip,
        gameweek: group.gameweek,
      });
    }
  });

  const allChips = ["triple_joker", "double_jokers", "maximum_joker"];

  const data = users.map((user) => {
    const userId = user._id.toString();
    const userChipMap = usedByUser.get(userId) || new Map();

    const usedChips = allChips
      .filter((chip) => userChipMap.has(chip))
      .map((chip) => userChipMap.get(chip));

    const remainingChips = allChips
      .filter((chip) => !userChipMap.has(chip))
      .map((chip) => ({
        chip,
        label: CHIP_LABELS[chip],
      }));

    return {
      userId,
      fullName: user.fullName,
      email: user.email,
      isCurrentUser: userId === req.user._id.toString(),
      usedChips,
      remainingChips,
      usedCount: usedChips.length,
      remainingCount: remainingChips.length,
    };
  });

  return res.json(data);
});

router.get("/all", protect, adminOnly, async (req, res) => {
  const { round, fixtureId, userId } = req.query;

  const filter = {};

  if (round) filter.gameweek = round;
  if (fixtureId) filter.fixture = fixtureId;
  if (userId) filter.user = userId;

  const predictions = await Prediction.find(filter)
    .populate("user", "fullName email role")
    .populate("fixture");

  const fixtureFilter = {};

  if (round) fixtureFilter.gameweek = round;
  if (fixtureId) fixtureFilter._id = fixtureId;

  const fixtures = await Fixture.find(fixtureFilter).sort({ createdAt: 1 });

  const normalizedPredictions = predictions.map(normalizePrediction);

  const orderedPredictions = sortPredictionsByFixtureOrder(
    normalizedPredictions,
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

  const visibleFixtures = await Fixture.find(fixturesFilter).sort({
    createdAt: 1,
  });

  const visibleFixtureIds = visibleFixtures.map((fixture) => fixture._id);

  const predictionFilter = {
    fixture: { $in: visibleFixtureIds },
  };

  if (userId) predictionFilter.user = userId;

  const predictions = await Prediction.find(predictionFilter)
    .populate("user", "fullName email role")
    .populate("fixture");

  const normalizedPredictions = predictions.map(normalizePrediction);

  const orderedPredictions = sortPredictionsByFixtureOrder(
    normalizedPredictions,
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
    return res.status(400).json({
      message: "No unlocked matches in this round",
    });
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
  let cupJokerCount = 0;

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

    if (prediction.isCupJoker) {
      cupJokerCount += 1;
    }
  }

  if (specialChip === "double_jokers") {
    if (jokerCount !== 2) {
      return res.status(400).json({
        message: "Double Jokers chip requires exactly 2 jokers in this round",
      });
    }

    if (cupJokerCount !== 1) {
      return res.status(400).json({
        message: "Choose exactly one Main Cup Joker for this round",
      });
    }
  } else if (specialChip === "maximum_joker") {
    if (jokerCount !== 0) {
      return res.status(400).json({
        message:
          "Maximum Joker chip chooses the best game automatically, do not select a joker",
      });
    }

    if (cupJokerCount !== 1) {
      return res.status(400).json({
        message: "Choose exactly one Main Cup Joker for this round",
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
    const usedSameChipInAnotherRound = await Prediction.findOne({
      user: req.user._id,
      specialChip,
      gameweek: { $ne: gameweek },
    });

    if (usedSameChipInAnotherRound) {
      return res.status(400).json({
        message: "You already used this chip in another round",
      });
    }
  }

  const operations = predictions.map((prediction) => {
    const fixture = fixtureMap.get(prediction.fixtureId);

    let isCupJoker = Boolean(prediction.isCupJoker);

    if (specialChip === "none" || specialChip === "triple_joker") {
      isCupJoker = Boolean(prediction.isJoker);
    }

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
            isCupJoker,
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
    .populate("fixture");

  const normalizedSavedPredictions = savedPredictions.map(normalizePrediction);

  const orderedSavedPredictions = sortPredictionsByFixtureOrder(
    normalizedSavedPredictions,
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