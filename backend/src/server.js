import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import fixtureRoutes from "./routes/fixtureRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";

dotenv.config();
await connectDB();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // allow requests with no origin, like Postman / direct backend tests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/api", (_req, res) => {
  res.json({ message: "WC26 Predictions API is running" });
});

app.get("/", (_req, res, next) => {
  const frontendIndex = path.join(__dirname, "../dist/index.html");

  res.sendFile(frontendIndex, (err) => {
    if (err) {
      next();
    }
  });
});

/* API ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fixtures", fixtureRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/settings", settingRoutes);

/* SERVE FRONTEND BUILD */
app.use(express.static(path.join(__dirname, "../dist")));

/* API 404 */
app.use("/api", (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* REACT ROUTER FALLBACK */
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});