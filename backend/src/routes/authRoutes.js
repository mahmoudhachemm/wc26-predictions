import express from "express";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

function userResponse(user) {
  return {
    user: user.toJSON(),
    token: generateToken(user._id),
  };
}

router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, fullName, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({ message: "This email already has an account" });
    }

    const name = fullName || `${firstName || ""} ${lastName || ""}`.trim();

    if (!name) {
      return res.status(400).json({ message: "Full name is required" });
    }

    const user = await User.create({
      fullName: name,
      email: email.toLowerCase(),
      password,
      role: "user",
    });

    return res.status(201).json(userResponse(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    return res.json(userResponse(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/me", protect, async (req, res) => {
  return res.json(req.user);
});

export default router;
