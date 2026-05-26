import express from "express";
import User from "../models/User.js";
import Prediction from "../models/Prediction.js";

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email === "admin@gmail.com") {
      return res.status(403).json({ message: "Main admin cannot be deleted" });
    }

    // Delete all predictions made by this user
    await Prediction.deleteMany({ user: userId });
    await Prediction.deleteMany({ userId: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully", id: userId });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// Update user role
router.patch("/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email === "admin@gmail.com") {
      return res.status(403).json({ message: "Main admin role cannot be changed" });
    }

    user.role = role;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.error("UPDATE USER ROLE ERROR:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

export default router;