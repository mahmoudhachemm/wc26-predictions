import express from "express";
import User from "../models/User.js";
import Prediction from "../models/Prediction.js";
import CupGroup from "../models/CupGroup.js";
import CupMatch from "../models/CupMatch.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { calculatePoints } from "../utils/calculatePoints.js";

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

const KNOCKOUT_ROUNDS = [
  "Round of 32",
  "Round of 16",
  "Quarter Final",
  "Semi Final",
  "Final",
];

const ALL_CUP_ROUNDS = [...GROUP_ROUNDS, ...KNOCKOUT_ROUNDS];

const ROUND_OF_32_TEMPLATE = [
  { no: 1, a: "2A", b: "2B" },
  { no: 2, a: "1E", b: "3A/B/C/D/F" },
  { no: 3, a: "1F", b: "2C" },
  { no: 4, a: "1C", b: "2F" },
  { no: 5, a: "1I", b: "3C/D/F/G/H" },
  { no: 6, a: "2E", b: "2I" },
  { no: 7, a: "1A", b: "3C/E/F/H/I" },
  { no: 8, a: "1L", b: "3E/H/I/J/K" },
  { no: 9, a: "1D", b: "3B/E/F/I/J" },
  { no: 10, a: "1G", b: "3A/E/H/I/J" },
  { no: 11, a: "2K", b: "2L" },
  { no: 12, a: "1H", b: "2J" },
  { no: 13, a: "1B", b: "3E/F/G/I/J" },
  { no: 14, a: "1J", b: "2H" },
  { no: 15, a: "1K", b: "3D/E/I/J/L" },
  { no: 16, a: "2D", b: "2G" },
];

const NEXT_ROUND_TEMPLATES = {
  "Round of 32": {
    nextRound: "Round of 16",
    matches: [
      { no: 17, a: 1, b: 3 },
      { no: 18, a: 2, b: 5 },
      { no: 19, a: 4, b: 6 },
      { no: 20, a: 7, b: 8 },
      { no: 21, a: 11, b: 12 },
      { no: 22, a: 9, b: 10 },
      { no: 23, a: 14, b: 16 },
      { no: 24, a: 13, b: 15 },
    ],
  },

  "Round of 16": {
    nextRound: "Quarter Final",
    matches: [
      { no: 25, a: 17, b: 18 },
      { no: 26, a: 21, b: 22 },
      { no: 27, a: 19, b: 20 },
      { no: 28, a: 23, b: 24 },
    ],
  },

  "Quarter Final": {
    nextRound: "Semi Final",
    matches: [
      { no: 29, a: 25, b: 26 },
      { no: 30, a: 27, b: 28 },
    ],
  },

  "Semi Final": {
    nextRound: "Final",
    matches: [{ no: 31, a: 29, b: 30 }],
  },
};

const PREVIOUS_ROUND = {
  "Round of 16": "Round of 32",
  "Quarter Final": "Round of 16",
  "Semi Final": "Quarter Final",
  Final: "Semi Final",
};

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

function getGroupLetter(groupName) {
  return String(groupName || "").replace("Group ", "").trim();
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
    adminWinnerId: cleanId(item.adminWinner),
    adminWinnerName: item.adminWinner?.fullName || "",
    sourceMatchAId: cleanId(item.sourceMatchA),
    sourceMatchBId: cleanId(item.sourceMatchB),
  };
}

function hasResult(prediction) {
  return (
    prediction.actualScoreA !== null &&
    prediction.actualScoreA !== undefined &&
    prediction.actualScoreB !== null &&
    prediction.actualScoreB !== undefined
  );
}

function isCupJokerForCup(prediction) {
  const chip = prediction.specialChip || "none";

  if (chip === "none" && prediction.isJoker) return true;
  if (chip === "triple_joker" && prediction.isJoker) return true;
  if (chip === "double_jokers" && prediction.isCupJoker) return true;
  if (chip === "maximum_joker" && prediction.isCupJoker) return true;

  return false;
}

function calculatePredictionCupPoints(prediction) {
  if (!hasResult(prediction)) return 0;

  const basePoints = calculatePoints(
    prediction.predictedScoreA,
    prediction.predictedScoreB,
    prediction.actualScoreA,
    prediction.actualScoreB
  );

  return isCupJokerForCup(prediction) ? basePoints * 2 : basePoints;
}

async function getUserCupPointsForRound(userId, gameweek) {
  const predictions = await Prediction.find({
    user: userId,
    gameweek,
    fixtureStatus: "finished",
  });

  return predictions.reduce((sum, prediction) => {
    return sum + calculatePredictionCupPoints(prediction);
  }, 0);
}

async function getUserLeaderboardPoints(userId) {
  const predictions = await Prediction.find({
    user: userId,
    fixtureStatus: "finished",
  });

  return predictions.reduce((sum, prediction) => {
    return sum + Number(prediction.points || 0);
  }, 0);
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

function compareBySportRules(a, b) {
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

  if (b.leaderboardPoints !== a.leaderboardPoints) {
    return b.leaderboardPoints - a.leaderboardPoints;
  }

  return a.userName.localeCompare(b.userName);
}

function sortGroupRowsWithHeadToHead(rows, groupMatches) {
  const pointGroups = {};

  rows.forEach((row) => {
    if (!pointGroups[row.groupPoints]) {
      pointGroups[row.groupPoints] = [];
    }

    pointGroups[row.groupPoints].push(row);
  });

  const sortedPointValues = Object.keys(pointGroups)
    .map(Number)
    .sort((a, b) => b - a);

  const finalRows = [];

  sortedPointValues.forEach((points) => {
    const tiedRows = pointGroups[points];

    if (tiedRows.length === 1) {
      finalRows.push(tiedRows[0]);
      return;
    }

    if (tiedRows.length === 2) {
      const userA = tiedRows[0];
      const userB = tiedRows[1];

      const directWinner = getDirectWinnerBetween(
        groupMatches,
        userA.userId,
        userB.userId
      );

      if (directWinner === userA.userId) {
        finalRows.push(userA, userB);
        return;
      }

      if (directWinner === userB.userId) {
        finalRows.push(userB, userA);
        return;
      }
    }

    tiedRows.sort(compareBySportRules);
    finalRows.push(...tiedRows);
  });

  return finalRows;
}

async function buildGroupStandings() {
  const groups = await CupGroup.find({})
    .populate("users", "fullName role")
    .sort({ name: 1 });

  const matches = await CupMatch.find({ phase: "Group Stage" })
    .populate("userA", "fullName role")
    .populate("userB", "fullName role")
    .populate("winner", "fullName role")
    .sort({ matchNumber: 1 });

  const users = await User.find({ role: "user" });
  const leaderboardPointsMap = {};

  for (const user of users) {
    leaderboardPointsMap[user._id.toString()] = await getUserLeaderboardPoints(
      user._id
    );
  }

  const standings = [];

  for (const group of groups) {
    const rows = group.users.map((user) => ({
      userId: user._id.toString(),
      userName: user.fullName,
      groupName: group.name,
      groupLetter: getGroupLetter(group.name),
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

    const sortedRows = sortGroupRowsWithHeadToHead(rows, groupMatches);

    sortedRows.forEach((row, index) => {
      row.position = index + 1;
    });

    standings.push({
      groupId: group._id.toString(),
      groupName: group.name,
      groupLetter: getGroupLetter(group.name),
      rows: sortedRows,
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

  if (groupSize === 3) return [[[0, 1]], [[0, 2]], [[1, 2]]];
  if (groupSize === 2) return [[[0, 1]], [], []];

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

async function getNextMatchNumber() {
  const lastMatch = await CupMatch.findOne({}).sort({ matchNumber: -1 });
  return lastMatch ? Number(lastMatch.matchNumber || 0) + 1 : 1;
}

async function areAllGroupStageMatchesDone() {
  const matches = await CupMatch.find({ phase: "Group Stage" });

  if (matches.length === 0) return false;

  // Group stage ties are allowed.
  // Draw = both users get 1 point.
  return matches.every((match) => match.isCompleted);
}

async function areAllKnockoutMatchesDoneForRound(gameweek) {
  const matches = await CupMatch.find({ gameweek });

  if (matches.length === 0) return false;

  return matches.every(
    (match) =>
      match.isCompleted && match.winner && match.needsAdminDecision === false
  );
}

function getFixedGroupSlot(standings, slot) {
  const position = Number(slot[0]);
  const groupLetter = slot.slice(1);

  const group = standings.find((item) => item.groupLetter === groupLetter);

  if (!group) {
    throw new Error(`Group ${groupLetter} not found.`);
  }

  const row = group.rows[position - 1];

  if (!row) {
    throw new Error(`Slot ${slot} has no user.`);
  }

  return row;
}

function isThirdSlot(slot) {
  return String(slot).startsWith("3");
}

function parseThirdSlot(slot) {
  return slot.replace("3", "").split("/");
}

function getBestThirdRows(standings) {
  const thirds = [];

  standings.forEach((group) => {
    const third = group.rows?.[2];

    if (third) {
      thirds.push({
        ...third,
        groupName: group.groupName,
        groupLetter: group.groupLetter,
        seedType: "Third",
      });
    }
  });

  thirds.sort(compareBySportRules);

  return thirds.slice(0, 8);
}

function assignThirdUsersToSlots(bestThirds, thirdSlots) {
  const assignments = {};
  const usedUserIds = new Set();

  const sortedSlots = [...thirdSlots].sort((a, b) => {
    const aCandidates = bestThirds.filter((third) =>
      parseThirdSlot(a.slot).includes(third.groupLetter)
    ).length;

    const bCandidates = bestThirds.filter((third) =>
      parseThirdSlot(b.slot).includes(third.groupLetter)
    ).length;

    return aCandidates - bCandidates;
  });

  function backtrack(index) {
    if (index >= sortedSlots.length) return true;

    const current = sortedSlots[index];
    const allowedGroups = parseThirdSlot(current.slot);

    const candidates = bestThirds.filter((third) => {
      return (
        allowedGroups.includes(third.groupLetter) &&
        !usedUserIds.has(third.userId)
      );
    });

    for (const candidate of candidates) {
      assignments[current.matchNo] = candidate;
      usedUserIds.add(candidate.userId);

      if (backtrack(index + 1)) return true;

      usedUserIds.delete(candidate.userId);
      delete assignments[current.matchNo];
    }

    return false;
  }

  const success = backtrack(0);

  if (!success) {
    throw new Error(
      "Could not assign best third-place users to the FIFA Round of 32 slots."
    );
  }

  return assignments;
}

function buildRoundOf32Participants(standings) {
  const bestThirds = getBestThirdRows(standings);

  if (bestThirds.length !== 8) {
    throw new Error(
      `Round of 32 needs 8 best third-place users. Current: ${bestThirds.length}`
    );
  }

  const thirdSlots = ROUND_OF_32_TEMPLATE.filter(
    (match) => isThirdSlot(match.a) || isThirdSlot(match.b)
  ).map((match) => ({
    matchNo: match.no,
    slot: isThirdSlot(match.a) ? match.a : match.b,
  }));

  const thirdAssignments = assignThirdUsersToSlots(bestThirds, thirdSlots);

  return ROUND_OF_32_TEMPLATE.map((match) => {
    const userA = isThirdSlot(match.a)
      ? thirdAssignments[match.no]
      : getFixedGroupSlot(standings, match.a);

    const userB = isThirdSlot(match.b)
      ? thirdAssignments[match.no]
      : getFixedGroupSlot(standings, match.b);

    return {
      no: match.no,
      slotA: match.a,
      slotB: match.b,
      userA,
      userB,
    };
  });
}

async function cleanOldGroupTieDecisions() {
  await CupMatch.updateMany(
    {
      phase: "Group Stage",
      isCompleted: true,
      needsAdminDecision: true,
    },
    {
      $set: {
        needsAdminDecision: false,
        winner: null,
        adminWinner: null,
      },
    }
  );
}

async function generateRoundOf32() {
  const existing = await CupMatch.countDocuments({
    gameweek: "Round of 32",
  });

  if (existing > 0) {
    throw new Error("Round of 32 already generated.");
  }

  await cleanOldGroupTieDecisions();

  const groupStageDone = await areAllGroupStageMatchesDone();

  if (!groupStageDone) {
    throw new Error("Group stage is not fully submitted yet.");
  }

  const standings = await buildGroupStandings();
  const roundOf32Matches = buildRoundOf32Participants(standings);

  let matchNumber = await getNextMatchNumber();

  for (const item of roundOf32Matches) {
    await CupMatch.create({
      phase: "Knockout",
      gameweek: "Round of 32",
      groupName: "",
      knockoutRound: "Round of 32",
      matchNumber,
      cupBracketMatchNumber: item.no,
      bracketSlotA: item.slotA,
      bracketSlotB: item.slotB,
      userA: item.userA.userId,
      userB: item.userB.userId,
      cupScoreA: 0,
      cupScoreB: 0,
      winner: null,
      adminWinner: null,
      isCompleted: false,
      needsAdminDecision: false,
    });

    matchNumber += 1;
  }
}

async function generateNextKnockoutRound(currentRound) {
  const template = NEXT_ROUND_TEMPLATES[currentRound];

  if (!template) {
    throw new Error(`No next round after ${currentRound}.`);
  }

  const existingNext = await CupMatch.countDocuments({
    gameweek: template.nextRound,
  });

  if (existingNext > 0) {
    throw new Error(`${template.nextRound} already generated.`);
  }

  const currentDone = await areAllKnockoutMatchesDoneForRound(currentRound);

  if (!currentDone) {
    throw new Error(`${currentRound} is not fully submitted yet.`);
  }

  const allKnockoutMatches = await CupMatch.find({ phase: "Knockout" });
  const matchMap = {};

  allKnockoutMatches.forEach((match) => {
    if (match.cupBracketMatchNumber) {
      matchMap[Number(match.cupBracketMatchNumber)] = match;
    }
  });

  let matchNumber = await getNextMatchNumber();

  for (const item of template.matches) {
    const sourceA = matchMap[item.a];
    const sourceB = matchMap[item.b];

    if (!sourceA || !sourceB || !sourceA.winner || !sourceB.winner) {
      throw new Error(`Cannot generate Match ${item.no}. Missing winner.`);
    }

    await CupMatch.create({
      phase: "Knockout",
      gameweek: template.nextRound,
      groupName: "",
      knockoutRound: template.nextRound,
      matchNumber,
      cupBracketMatchNumber: item.no,
      bracketSlotA: `Winner Match ${item.a}`,
      bracketSlotB: `Winner Match ${item.b}`,
      userA: sourceA.winner,
      userB: sourceB.winner,
      sourceMatchA: sourceA._id,
      sourceMatchB: sourceB._id,
      cupScoreA: 0,
      cupScoreB: 0,
      winner: null,
      adminWinner: null,
      isCompleted: false,
      needsAdminDecision: false,
    });

    matchNumber += 1;
  }
}

async function generateRequestedRound(gameweek) {
  if (gameweek === "Round of 32") {
    await generateRoundOf32();
    return;
  }

  const previousRound = PREVIOUS_ROUND[gameweek];

  if (!previousRound) {
    throw new Error(`Cannot manually generate ${gameweek}.`);
  }

  await generateNextKnockoutRound(previousRound);
}

async function deleteRoundAndFuture(gameweek) {
  const index = ALL_CUP_ROUNDS.indexOf(gameweek);

  if (index === -1) return;

  const roundsToDelete = ALL_CUP_ROUNDS.slice(index);

  await CupMatch.deleteMany({
    gameweek: { $in: roundsToDelete },
  });
}

async function loadCupPayload(message = "") {
  const groups = await CupGroup.find({})
    .populate("users", "fullName role")
    .sort({ name: 1 });

  const matches = await CupMatch.find({})
    .populate("userA", "fullName role")
    .populate("userB", "fullName role")
    .populate("winner", "fullName role")
    .populate("adminWinner", "fullName role")
    .sort({ matchNumber: 1 });

  const standings = await buildGroupStandings();

  return {
    message,
    groups,
    matches: matches.map(normalizeCupMatch),
    standings,
    groupRounds: GROUP_ROUNDS,
    knockoutRounds: KNOCKOUT_ROUNDS,
  };
}

async function generateRandomGroupStage(req, res) {
  try {
    const playingUsers = await User.find({ role: "user" }).sort({
      fullName: 1,
    });

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

      const randomizedSchedule = shuffleArray(
        getScheduleForGroup(groupUsers.length)
      );

      for (
        let roundIndex = 0;
        roundIndex < GROUP_ROUNDS.length;
        roundIndex += 1
      ) {
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
            knockoutRound: "",
            matchNumber,
            cupBracketMatchNumber: null,
            bracketSlotA: "",
            bracketSlotB: "",
            userA: userA._id,
            userB: userB._id,
            cupScoreA: 0,
            cupScoreB: 0,
            winner: null,
            adminWinner: null,
            isCompleted: false,
            needsAdminDecision: false,
          });

          matchNumber += 1;
        }
      }
    }

    const payload = await loadCupPayload(
      "Random group stage generated successfully."
    );

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to generate random group stage.",
    });
  }
}

router.get("/", protect, async (req, res) => {
  try {
    const payload = await loadCupPayload();
    return res.json(payload);
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

router.post("/fix-group-ties", protect, adminOnly, async (req, res) => {
  try {
    await cleanOldGroupTieDecisions();

    const payload = await loadCupPayload("Group stage ties fixed successfully.");

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fix group ties.",
    });
  }
});

router.post("/generate-round/:gameweek", protect, adminOnly, async (req, res) => {
  try {
    const gameweek = decodeURIComponent(req.params.gameweek);

    if (!KNOCKOUT_ROUNDS.includes(gameweek)) {
      return res.status(400).json({
        message: "Only knockout rounds can be generated manually.",
      });
    }

    await generateRequestedRound(gameweek);

    const payload = await loadCupPayload(`${gameweek} generated successfully.`);

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to generate Cup round.",
    });
  }
});

router.post("/submit-round/:gameweek", protect, adminOnly, async (req, res) => {
  try {
    const gameweek = decodeURIComponent(req.params.gameweek);

    if (!ALL_CUP_ROUNDS.includes(gameweek)) {
      return res.status(400).json({
        message: "Invalid Cup round.",
      });
    }

    const matches = await CupMatch.find({ gameweek });

    if (matches.length === 0) {
      return res.status(400).json({
        message: `No Cup games found for ${gameweek}.`,
      });
    }

    const isGroupStageRound = GROUP_ROUNDS.includes(gameweek);

    for (const match of matches) {
      const scoreA = await getUserCupPointsForRound(match.userA, gameweek);
      const scoreB = await getUserCupPointsForRound(match.userB, gameweek);

      match.cupScoreA = scoreA;
      match.cupScoreB = scoreB;
      match.isCompleted = true;
      match.needsAdminDecision = false;

      if (match.adminWinner) {
        match.winner = match.adminWinner;
      } else if (scoreA > scoreB) {
        match.winner = match.userA;
      } else if (scoreB > scoreA) {
        match.winner = match.userB;
      } else if (isGroupStageRound) {
        // Group-stage draw: no winner, no admin decision, both users get 1 group point.
        match.winner = null;
        match.adminWinner = null;
        match.needsAdminDecision = false;
      } else {
        // Knockout draw: admin must choose a winner.
        match.winner = null;
        match.needsAdminDecision = true;
      }

      await match.save();
    }

    const payload = await loadCupPayload(`${gameweek} submitted successfully.`);

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to submit Cup round.",
    });
  }
});

router.post("/reset-round/:gameweek", protect, adminOnly, async (req, res) => {
  try {
    const gameweek = decodeURIComponent(req.params.gameweek);

    if (!ALL_CUP_ROUNDS.includes(gameweek)) {
      return res.status(400).json({
        message: "Invalid Cup round.",
      });
    }

    if (GROUP_ROUNDS.includes(gameweek)) {
      await CupMatch.updateMany(
        { gameweek },
        {
          $set: {
            cupScoreA: 0,
            cupScoreB: 0,
            winner: null,
            adminWinner: null,
            isCompleted: false,
            needsAdminDecision: false,
          },
        }
      );
    } else {
      await deleteRoundAndFuture(gameweek);
    }

    const payload = await loadCupPayload(`${gameweek} reset successfully.`);

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to reset Cup round.",
    });
  }
});

router.post("/recalculate", protect, adminOnly, async (req, res) => {
  try {
    await cleanOldGroupTieDecisions();

    const payload = await loadCupPayload("Cup recalculated successfully.");

    return res.json(payload);
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
      return res.status(404).json({
        message: "Cup match not found.",
      });
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

    const payload = await loadCupPayload("Tie winner selected successfully.");

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to set admin winner.",
    });
  }
});

export default router;