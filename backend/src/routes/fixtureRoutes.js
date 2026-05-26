import express from "express";
import Fixture from "../models/Fixture.js";
import Prediction from "../models/Prediction.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const { round } = req.query;
  const filter = round ? { gameweek: round } : {};
  const fixtures = await Fixture.find(filter).sort({ createdAt: 1 });
  return res.json(fixtures);
});

router.post("/", protect, adminOnly, async (req, res) => {
  const { gameweek, teamA, teamB, kickoffTime } = req.body;

  if (!gameweek || !teamA || !teamB || !kickoffTime) {
    return res.status(400).json({ message: "Round, teams, and kickoff time are required" });
  }

  if (teamA === teamB) {
    return res.status(400).json({ message: "Team A and Team B cannot be the same" });
  }

  const fixture = await Fixture.create({
    gameweek,
    teamA,
    teamB,
    kickoffTime,
  });

  return res.status(201).json(fixture);
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);

  if (!fixture) {
    return res.status(404).json({ message: "Fixture not found" });
  }

  await Prediction.deleteMany({ fixture: fixture._id });
  await fixture.deleteOne();

  return res.json({ message: "Fixture and predictions deleted" });
});

router.patch("/:id/lock", protect, adminOnly, async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);

  if (!fixture) {
    return res.status(404).json({ message: "Fixture not found" });
  }

  fixture.isLocked = true;
  await fixture.save();
  return res.json(fixture);
});

router.patch("/:id/unlock", protect, adminOnly, async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);

  if (!fixture) {
    return res.status(404).json({ message: "Fixture not found" });
  }

  if (fixture.status === "finished") {
    return res.status(400).json({ message: "Cannot unlock a finished game" });
  }

  fixture.isLocked = false;
  await fixture.save();
  return res.json(fixture);
});

router.patch("/round/:round/lock", protect, adminOnly, async (req, res) => {
  await Fixture.updateMany({ gameweek: req.params.round }, { isLocked: true });
  const fixtures = await Fixture.find({ gameweek: req.params.round }).sort({ createdAt: 1 });
  return res.json(fixtures);
});

router.patch("/round/:round/unlock", protect, adminOnly, async (req, res) => {
  await Fixture.updateMany(
    { gameweek: req.params.round, status: { $ne: "finished" } },
    { isLocked: false }
  );

  const fixtures = await Fixture.find({ gameweek: req.params.round }).sort({ createdAt: 1 });
  return res.json(fixtures);
});

export default router;
