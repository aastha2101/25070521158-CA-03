const express = require("express");
const User = require("../models/User");
const Expense = require("../models/Expense");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", async (req, res) => {
  try {
    const [users, expenseStats, recentExpenses] = await Promise.all([
      User.countDocuments({ role: "user" }),

      Expense.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Expense.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "name email"),
    ]);

    res.json({
      totalUsers: users,
      totalExpenses: expenseStats[0]?.count || 0,
      totalSpending: expenseStats[0]?.total || 0,
      recentExpenses,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load admin dashboard" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("name email createdAt")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Could not load users" });
  }
});

module.exports = router;