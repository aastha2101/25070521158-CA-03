require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createAdmin() {
  try {
    if (
      !process.env.MONGO_URI ||
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET === "replace_this_with_a_long_random_secret"
    ) {
      throw new Error("Configure MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD and a strong JWT_SECRET in .env");
    }

    if (process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role !== "admin") {
        throw new Error("That email belongs to a non-admin account. Choose a separate ADMIN_EMAIL.");
      }

      console.log("Admin account already exists. No changes made.");
      return;
    }

    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

    await User.create({
      name: process.env.ADMIN_NAME || "Admin",
      email,
      password,
      role: "admin",
    });

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();