import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

await connectDB();

const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
const password = process.env.ADMIN_PASSWORD || "admin123";

const existingAdmin = await User.findOne({ email });

if (existingAdmin) {
  existingAdmin.role = "admin";
  await existingAdmin.save();
  console.log(`Admin already exists and is admin: ${email}`);
  process.exit(0);
}

await User.create({
  fullName: "Main Admin",
  email,
  password,
  role: "admin",
});

console.log(`Admin created: ${email}`);
process.exit(0);
