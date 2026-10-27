const express = require("express");
const Expense = require("../models/Expense");
const { protect } = require("../middleware/auth");

const router = express.Router();

const categories = [
  "Food", "Travel", "Shopping", "Bills",
  "Education", "Health", "Entertainment", "Other",
];

function validateExpense(body) {
  const { title, amount, category, date, notes } = body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 100 ||
    amount === "" ||
    amount === null ||
    amount === undefined ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    !categories.includes(category)
  ) {
    return "Enter a valid title, positive amount and category";
  }

  if (date && Number.isNaN(Date.parse(date))) {
    return "Enter a valid date";
  }

  if (notes !== undefined &&
      (typeof notes !== "string" || notes.length > 500)) {
    return "Notes must be text under 500 characters";
  }

  return null;
}

router.use(protect);

// Get the logged-in user's expenses
router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch expenses" });
  }
});

// Add an expense
router.post("/", async (req, res) => {
  try {
    const problem = validateExpense(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const expense = await Expense.create({
      user: req.user._id,
      title: req.body.title.trim(),
      amount: Number(req.body.amount),
      category: req.body.category,
      date: req.body.date || new Date(),
      notes: req.body.notes || "",
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Could not add expense" });
  }
});

// Update an expense belonging to the logged-in user
router.put("/:id", async (req, res) => {
  try {
    const problem = validateExpense(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        title: req.body.title.trim(),
        amount: Number(req.body.amount),
        category: req.body.category,
        date: req.body.date || new Date(),
        notes: req.body.notes || "",
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid expense ID" });
    }
    res.status(500).json({ message: "Could not update expense" });
  }
});

// Delete an expense belonging to the logged-in user
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid expense ID" });
    }
    res.status(500).json({ message: "Could not delete expense" });
  }
});

module.exports = router;