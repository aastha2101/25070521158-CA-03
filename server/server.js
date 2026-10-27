require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
}));

app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.json({ message: "Personal Expense Tracker API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();