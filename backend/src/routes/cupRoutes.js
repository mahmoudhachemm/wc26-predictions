import express from "express";
import User from "../models/User.js";
import Prediction from "../models/Prediction.js";
import CupGroup from "../models/CupGroup.js";
import CupMatch from "../models/CupMatch.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

const GROUP_NAMES = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Group E",
  "Group F",
  "Group G",
  "Group H",
  "Group I",
  "Group J",
  "Group K",
  "Group L",
];

const GROUP_ROUNDS = ["Round 1", "Round 2", "Round 3"];

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function cleanId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString();
}

function normalizeCupMatch(match) {
  const item = match.toObject ? match.toObject() : match;

  return {
    ...item,
    id: cleanId(item._id || item.id),
    userAId: cleanId(item.userA),
    userBId: cleanId(item.userB),
    userAName: item.userA?.fullName || "",
    userBName: item.userB?.fullName || "",
    winnerId: cleanId(item.winner),
    winnerName: item.winner?.fullName || "",
  };
}

async function getUserCupData(userId, gameweek) {
  const predictions = await Prediction.find({
    user: userId,
    gameweek,
    fixtureStatus: "finished",
  });

  const cupPoints = predictions.reduce(
    (sum, prediction) => sum + Number(prediction.cupPoints || prediction.points || 0),
    0
  );

  return {
    cupPoints,
    hasFinishedPredictions: predictions.length > 0,
  };
}

async function getUserLeaderboardPoints(userId) {
  const predictions = await Prediction.find({
    user: userId,
    fixtureStatus: "finished",
  });

  return predictions.reduce(
    (sum, prediction) => sum + Number(prediction.points || 0),
    0
  );
}

async function recalculateGroupStageMatches() {
  const matches = await CupMatch.find({ phase: "Group Stage" });

  for (const match of matches) {
    if (!match.userA || !match.userB) continue;

    const userAData = await getUserCupData(match.userA, match.gameweek);
    const userBData = await getUserCupData(match.userB, match.gameweek);

    match.cupScoreA = userAData.cupPoints;
    match.cupScoreB = userBData.cupPoints;

    const isCompleted =
      userAData.hasFinishedPredictions || userBData.hasFinishedPredictions;

    match.isCompleted = isCompleted;
    match.needsAdminDecision = false;

    if (!isCompleted) {
      match.winner = null;
    } else if (match.adminWinner) {
      match.winner = match.adminWinner;
    } else if (match.cupScoreA > match.cupScoreB) {
      match.winner = match.userA;
    } else if (match.cupScoreB > match.cupScoreA) {
      match.winner = match.userB;
    } else {
      match.winner = null;
      match.needsAdminDecision = true;
    }

    await match.save();
  }
}

function getDirectWinnerBetween(groupMatches, userAId, userBId) {
  const directMatch = groupMatches.find((match) => {
    const aId = cleanId(match.userA);
    const bId = cleanId(match.userB);

    return (
      (aId === userAId && bId === userBId) ||
      (aId === userBId && bId === userAId)
    );
  });

  if (!directMatch || !directMatch.winner) return "";

  return cleanId(directMatch.winner);
}

async function buildGroupStandings() {
  await recalculateGroupStageMatches();

  const groups = await CupGroup.find({})
    .populate("users", "fullName email role")
    .sort({ name: 1 });

  const matches = await CupMatch.find({ phase: "Group Stage" })
    .populate("userA", "fullName email role")
    .populate("userB", "fullName email role")
    .populate("winner", "fullName email role")
    .sort({ matchNumber: 1 });

  const leaderboardPointsMap = {};
  const users = await User.find({ role: "user" });

  for (const user of users) {
    leaderboardPointsMap[user._id.toString()] =
      await getUserLeaderboardPoints(user._id);
  }

  const standings = [];

  for (const group of groups) {
    const rows = group.users.map((user) => ({
      userId: user._id.toString(),
      userName: user.fullName,
      groupName: group.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      groupPoints: 0,
      cupPointsFor: 0,
      cupPointsAgainst: 0,
      cupPointsDifference: 0,
      leaderboardPoints: leaderboardPointsMap[user._id.toString()] || 0,
    }));

    const rowMap = {};

    rows.forEach((row) => {
      rowMap[row.userId] = row;
    });

    const groupMatches = matches.filter(
      (match) => match.groupName === group.name && match.isCompleted
    );

    for (const match of groupMatches) {
      const userAId = cleanId(match.userA);
      const userBId = cleanId(match.userB);

      if (!rowMap[userAId] || !rowMap[userBId]) continue;

      const rowA = rowMap[userAId];
      const rowB = rowMap[userBId];

      rowA.played += 1;
      rowB.played += 1;

      rowA.cupPointsFor += Number(match.cupScoreA || 0);
      rowA.cupPointsAgainst += Number(match.cupScoreB || 0);

      rowB.cupPointsFor += Number(match.cupScoreB || 0);
      rowB.cupPointsAgainst += Number(match.cupScoreA || 0);

      const winnerId = cleanId(match.winner);

      if (winnerId === userAId) {
        rowA.wins += 1;
        rowA.groupPoints += 3;
        rowB.losses += 1;
      } else if (winnerId === userBId) {
        rowB.wins += 1;
        rowB.groupPoints += 3;
        rowA.losses += 1;
      } else {
        rowA.draws += 1;
        rowB.draws += 1;
        rowA.groupPoints += 1;
        rowB.groupPoints += 1;
      }
    }

    rows.forEach((row) => {
      row.cupPointsDifference = row.cupPointsFor - row.cupPointsAgainst;
    });

    rows.sort((a, b) => {
      if (b.groupPoints !== a.groupPoints) {
        return b.groupPoints - a.groupPoints;
      }

      if (b.cupPointsDifference !== a.cupPointsDifference) {
        return b.cupPointsDifference - a.cupPointsDifference;
      }

      if (b.cupPointsFor !== a.cupPointsFor) {
        return b.cupPointsFor - a.cupPointsFor;
      }

      if (a.cupPointsAgainst !== b.cupPointsAgainst) {
        return a.cupPointsAgainst - b.cupPointsAgainst;
      }

      const directWinner = getDirectWinnerBetween(groupMatches, a.userId, b.userId);

      if (directWinner === a.userId) return -1;
      if (directWinner === b.userId) return 1;

      if (b.leaderboardPoints !== a.leaderboardPoints) {
        return b.leaderboardPoints - a.leaderboardPoints;
      }

      return a.userName.localeCompare(b.userName);
    });

    rows.forEach((row, index) => {
      row.position = index + 1;
    });

    standings.push({
      groupId: group._id.toString(),
      groupName: group.name,
      rows,
    });
  }

  return standings;
}

function getScheduleForGroup(groupSize) {
  if (groupSize === 4) {
    return [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 3],
      ],
      [
        [0, 3],
        [1, 2],
      ],
    ];
  }

  if (groupSize === 3) {
    return [
      [[0, 1]],
      [[0, 2]],
      [[1, 2]],
    ];
  }

  if (groupSize === 2) {
    return [
      [[0, 1]],
      [],
      [],
    ];
  }

  return [[], [], []];
}

function splitUsersIntoGroups(users) {
  const totalUsers = users.length;

  if (totalUsers < 2) {
    throw new Error("Cup needs at least 2 users.");
  }

  if (totalUsers > 48) {
    throw new Error("Cup group stage supports maximum 48 users.");
  }

  const groupCount = Math.min(12, Math.ceil(totalUsers / 4));
  const groups = Array.from({ length: groupCount }, () => []);

  users.forEach((user, index) => {
    groups[index % groupCount].push(user);
  });

  return groups;
}

async function generateRandomGroupStage(req, res) {
  try {
    const playingUsers = await User.find({ role: "user" }).sort({ fullName: 1 });

    if (playingUsers.length < 2) {
      return res.status(400).json({
        message: `Cup needs at least 2 playing users. Current playing users: ${playingUsers.length}`,
      });
    }

    if (playingUsers.length > 48) {
      return res.status(400).json({
        message: `Cup group stage supports maximum 48 users. Current playing users: ${playingUsers.length}`,
      });
    }

    await CupGroup.deleteMany({});
    await CupMatch.deleteMany({});

    const shuffledUsers = shuffleArray(playingUsers);
    const groupedUsers = splitUsersIntoGroups(shuffledUsers);

    let matchNumber = 1;

    for (let groupIndex = 0; groupIndex < groupedUsers.length; groupIndex += 1) {
      const groupUsers = groupedUsers[groupIndex];
      const groupName = GROUP_NAMES[groupIndex];

      const group = await CupGroup.create({
        name: groupName,
        users: groupUsers.map((user) => user._id),
      });

      const randomizedSchedule = shuffleArray(getScheduleForGroup(groupUsers.length));

      for (let roundIndex = 0; roundIndex < GROUP_ROUNDS.length; roundIndex += 1) {
        const gameweek = GROUP_ROUNDS[roundIndex];
        const roundPairs = randomizedSchedule[roundIndex] || [];

        for (const pair of roundPairs) {
          const userA = groupUsers[pair[0]];
          const userB = groupUsers[pair[1]];

          if (!userA || !userB) continue;

          await CupMatch.create({
            phase: "Group Stage",
            gameweek,
            groupName: group.name,
            matchNumber,
            userA: userA._id,
            userB: userB._id,
          });

          matchNumber += 1;
        }
      }
    }

    const groups = await CupGroup.find({})
      .populate("users", "fullName email role")
      .sort({ name: 1 });

    const matches = await CupMatch.find({})
      .populate("userA", "fullName email role")
      .populate("userB", "fullName email role")
      .populate("winner", "fullName email role")
      .sort({ matchNumber: 1 });

    const standings = await buildGroupStandings();

    return res.json({
      message: "Random group stage generated successfully.",
      groups,
      matches: matches.map(normalizeCupMatch),
      standings,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to generate random group stage.",
    });
  }
}

router.get("/", protect, async (req, res) => {
  try {
    const groups = await CupGroup.find({})
      .populate("users", "fullName email role")
      .sort({ name: 1 });

    const matches = await CupMatch.find({})
      .populate("userA", "fullName email role")
      .populate("userB", "fullName email role")
      .populate("winner", "fullName email role")
      .sort({ matchNumber: 1 });

    const standings = await buildGroupStandings();

    return res.json({
      groups,
      matches: matches.map(normalizeCupMatch),
      standings,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load cup.",
    });
  }
});

router.get("/standings", protect, async (req, res) => {
  try {
    const standings = await buildGroupStandings();

    return res.json({
      standings,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load cup standings.",
    });
  }
});

router.post("/generate-group-stage", protect, adminOnly, generateRandomGroupStage);

router.post("/generate-groups", protect, adminOnly, generateRandomGroupStage);

router.post("/recalculate", protect, adminOnly, async (req, res) => {
  try {
    await recalculateGroupStageMatches();

    const groups = await CupGroup.find({})
      .populate("users", "fullName email role")
      .sort({ name: 1 });

    const matches = await CupMatch.find({})
      .populate("userA", "fullName email role")
      .populate("userB", "fullName email role")
      .populate("winner", "fullName email role")
      .sort({ matchNumber: 1 });

    const standings = await buildGroupStandings();

    return res.json({
      message: "Cup group stage recalculated successfully.",
      groups,
      matches: matches.map(normalizeCupMatch),
      standings,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to recalculate cup.",
    });
  }
});

router.post("/set-admin-winner/:matchId", protect, adminOnly, async (req, res) => {
  try {
    const { winnerId } = req.body;

    const match = await CupMatch.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({ message: "Cup match not found." });
    }

    const validWinners = [cleanId(match.userA), cleanId(match.userB)];

    if (!validWinners.includes(winnerId)) {
      return res.status(400).json({
        message: "Winner must be one of the two users in this match.",
      });
    }

    match.adminWinner = winnerId;
    match.winner = winnerId;
    match.needsAdminDecision = false;
    match.isCompleted = true;

    await match.save();

    const updatedMatch = await CupMatch.findById(match._id)
      .populate("userA", "fullName email role")
      .populate("userB", "fullName email role")
      .populate("winner", "fullName email role");

    return res.json(normalizeCupMatch(updatedMatch));
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to set admin winner.",
    });
  }
});

export default router;