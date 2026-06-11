import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import fixtureRoutes from "./routes/fixtureRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import cupRoutes from "./routes/cupRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")
      : ["http://localhost:5173"],
    credentials: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fixtures", fixtureRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/cup", cupRoutes);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../dist");

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});