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
  double_jokers: "Double Jokers",
  maximum_joker: "Maximum Joker",
};

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

function cleanId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString();
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
  return cleanId(
    prediction.fixtureId ||
      prediction.fixture?._id ||
      prediction.fixture?.id ||
      prediction.fixture
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

function makeEmptyChipStatus(chipKey) {
  return {
    key: chipKey,
    label: CHIP_LABELS[chipKey],
    used: false,
    gameweek: "",
    games: [],
  };
}

function getMatchText(prediction) {
  return `${prediction.teamA} vs ${prediction.teamB}`;
}

function buildChipSummaryForUser(user, chipPredictions) {
  const chipStatus = {
    triple_joker: makeEmptyChipStatus("triple_joker"),
    double_jokers: makeEmptyChipStatus("double_jokers"),
    maximum_joker: makeEmptyChipStatus("maximum_joker"),
  };

  const userId = user._id.toString();

  const userChipPredictions = chipPredictions.filter((prediction) => {
    const predictionUserId = cleanId(prediction.user);
    return predictionUserId === userId;
  });

  Object.keys(chipStatus).forEach((chipKey) => {
    const predictionsForChip = userChipPredictions.filter(
      (prediction) => prediction.specialChip === chipKey
    );

    if (predictionsForChip.length === 0) return;

    chipStatus[chipKey].used = true;
    chipStatus[chipKey].gameweek = predictionsForChip[0].gameweek;

    let selectedGames = [];

    if (chipKey === "triple_joker") {
      selectedGames = predictionsForChip.filter(
        (prediction) => prediction.isJoker
      );
    }

    if (chipKey === "double_jokers") {
      selectedGames = predictionsForChip.filter(
        (prediction) => prediction.isJoker
      );
    }

    if (chipKey === "maximum_joker") {
      selectedGames = predictionsForChip.filter(
        (prediction) => prediction.isAutoMaxJoker
      );
    }

    chipStatus[chipKey].games = selectedGames.map((prediction) => ({
      fixtureId: cleanId(prediction.fixture),
      gameweek: prediction.gameweek,
      teamA: prediction.teamA,
      teamB: prediction.teamB,
      match: getMatchText(prediction),
      predictedScoreA: prediction.predictedScoreA,
      predictedScoreB: prediction.predictedScoreB,
      basePoints: prediction.basePoints || 0,
      points: prediction.points || 0,
      isJoker: prediction.isJoker,
      isAutoMaxJoker: prediction.isAutoMaxJoker,
      fixtureStatus: prediction.fixtureStatus,
    }));
  });

  const usedChips = Object.values(chipStatus)
    .filter((chip) => chip.used)
    .map((chip) => chip.key);

  const remainingChips = Object.values(chipStatus)
    .filter((chip) => !chip.used)
    .map((chip) => chip.key);

  return {
    userId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    chips: chipStatus,
    usedChips,
    remainingChips,
    usedCount: usedChips.length,
    remainingCount: remainingChips.length,
  };
}

router.get("/mine", protect, async (req, res) => {
  try {
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
  } catch (error) {
    console.error("GET MY PREDICTIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to load predictions" });
  }
});

router.get("/all", protect, adminOnly, async (req, res) => {
  try {
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
  } catch (error) {
    console.error("GET ALL PREDICTIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to load predictions" });
  }
});

router.get("/public", protect, async (req, res) => {
  try {
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
  } catch (error) {
    console.error("GET PUBLIC PREDICTIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to load predictions" });
  }
});

router.get("/chips-summary", protect, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({
      fullName: 1,
    });

    const chipPredictions = await Prediction.find({
      specialChip: { $ne: "none" },
    })
      .populate("user", "fullName email role")
      .populate("fixture")
      .sort({ createdAt: 1 });

    const summary = users.map((user) =>
      buildChipSummaryForUser(user, chipPredictions)
    );

    return res.json(summary);
  } catch (error) {
    console.error("CHIPS SUMMARY ERROR:", error);
    return res.status(500).json({ message: "Failed to load chips summary" });
  }
});

router.post("/save-round", protect, async (req, res) => {
  try {
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

    if (cupJokerCount !== 1) {
      return res.status(400).json({
        message: "Choose exactly one Main Cup Joker for this round",
      });
    }

    if (specialChip !== "none") {
      const usedSameChipInAnotherRound = await Prediction.findOne({
        user: req.user._id,
        specialChip,
        gameweek: { $ne: gameweek },
      });

      if (usedSameChipInAnotherRound) {
        return res.status(400).json({
          message: `${CHIP_LABELS[specialChip]} was already used in another round`,
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
              isCupJoker: Boolean(prediction.isCupJoker),
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
  } catch (error) {
    console.error("SAVE ROUND ERROR:", error);
    return res.status(500).json({ message: "Failed to save predictions" });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" });
    }

    await prediction.deleteOne();

    return res.json({ message: "Prediction deleted" });
  } catch (error) {
    console.error("DELETE PREDICTION ERROR:", error);
    return res.status(500).json({ message: "Failed to delete prediction" });
  }
});

export default router;