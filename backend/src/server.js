import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

console.log("SERVER FILE STARTED");

dotenv.config();

console.log("DOTENV LOADED");

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

console.log("EXPRESS + CORS READY");

async function startServer() {
  try {
    console.log("IMPORTING ROUTES...");

    const { default: authRoutes } = await import("./routes/authRoutes.js");
    console.log("authRoutes imported");

    const { default: userRoutes } = await import("./routes/userRoutes.js");
    console.log("userRoutes imported");

    const { default: fixtureRoutes } = await import("./routes/fixtureRoutes.js");
    console.log("fixtureRoutes imported");

    const { default: predictionRoutes } = await import(
      "./routes/predictionRoutes.js"
    );
    console.log("predictionRoutes imported");

    const { default: resultRoutes } = await import("./routes/resultRoutes.js");
    console.log("resultRoutes imported");

    const { default: leaderboardRoutes } = await import(
      "./routes/leaderboardRoutes.js"
    );
    console.log("leaderboardRoutes imported");

    const { default: settingRoutes } = await import("./routes/settingRoutes.js");
    console.log("settingRoutes imported");

    const { default: cupRoutes } = await import("./routes/cupRoutes.js");
    console.log("cupRoutes imported");

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/fixtures", fixtureRoutes);
    app.use("/api/predictions", predictionRoutes);
    app.use("/api/results", resultRoutes);
    app.use("/api/leaderboard", leaderboardRoutes);
    app.use("/api/settings", settingRoutes);
    app.use("/api/cup", cupRoutes);

    console.log("ALL ROUTES REGISTERED");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const frontendPath = path.join(__dirname, "../dist");

    console.log("FRONTEND PATH:", frontendPath);

    app.use(express.static(frontendPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

    console.log("CHECKING MONGO_URI...");

    if (!process.env.MONGO_URI) {
      console.log("MONGO_URI IS MISSING");
      return;
    }

    console.log("CONNECTING TO MONGODB...");

    mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(() => console.log("MongoDB connected"))
      .catch((err) => console.log("MongoDB error:", err.message));
  } catch (err) {
    console.log("SERVER STARTUP ERROR:");
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
  }
}

startServer();