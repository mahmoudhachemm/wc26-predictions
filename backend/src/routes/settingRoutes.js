import express from "express";
import Setting from "../models/Setting.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

const allowedRounds = [
  "Round 1",
  "Round 2",
  "Round 3",
  "Round of 32",
  "Round of 16",
  "Quarter Final",
  "Semi Final",
  "Final",
];

async function getOrCreateCurrentRound() {
  let setting = await Setting.findOne({ key: "currentRound" });

  if (!setting) {
    setting = await Setting.create({
      key: "currentRound",
      value: "Round 1",
    });
  }

  return setting;
}

// Get current round
router.get("/current-round", protect, async (_req, res) => {
  try {
    const setting = await getOrCreateCurrentRound();

    res.json({
      currentRound: setting.value || "Round 1",
    });
  } catch (error) {
    console.error("GET CURRENT ROUND ERROR:", error);
    res.status(500).json({ message: "Failed to load current round" });
  }
});

// Admin changes current round
router.patch("/current-round", protect, adminOnly, async (req, res) => {
  try {
    const { currentRound } = req.body;

    if (!allowedRounds.includes(currentRound)) {
      return res.status(400).json({ message: "Invalid round" });
    }

    const setting = await Setting.findOneAndUpdate(
      { key: "currentRound" },
      { value: currentRound },
      { new: true, upsert: true }
    );

    res.json({
      message: `${setting.value} is now the current round`,
      currentRound: setting.value,
    });
  } catch (error) {
    console.error("UPDATE CURRENT ROUND ERROR:", error);
    res.status(500).json({ message: "Failed to update current round" });
  }
});

export default router;