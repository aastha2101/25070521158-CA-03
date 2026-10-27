import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Education",
  "Health",
  "Entertainment",
  "Other",
];

const emptyForm = {
  title: "",
  amount: "",
  category: "Food",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function errorMessage(error) {
  return (
    error.response?.data?.message ||
    (error.code === "ERR_NETWORK"
      ? "Cannot connect to the server. Check that the backend is running."
      : error.message || "Something went wrong")
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function restoreSession() {
      if (!localStorage.getItem("token")) return;

      try {
        const response = await API.get("/auth/me");
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem("token");
        setMessage("Your session expired. Please log in again.");
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (user.role === "admin") {
      loadAdmin();
    } else {
      loadExpenses();
    }
  }, [user]);

  async function submitAuth(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint =
        mode === "login" ? "/auth/login" : "/auth/register";

      const response = await API.post(endpoint, authForm);

      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setAuthForm({ name: "", email: "", password: "" });
      setMessage("");
    } catch (error) {
      console.error("Registration/Login error:", error);
      console.error("Backend response:", error.response?.data);
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setExpenses([]);
    setAdmin(null);
    setAdminUsers([]);
    setEditingId(null);
    setForm({ ...emptyForm });
    setSearch("");
    setMessage("");
    setMode("login");
  }

  async function loadExpenses() {
    try {
      const response = await API.get("/expenses");
      setExpenses(response.data);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function saveExpense(event) {
    event.preventDefault();
    setMessage("");

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
      };

      if (editingId) {
        await API.put(`/expenses/${editingId}`, payload);
        setMessage("Expense updated successfully.");
      } else {
        await API.post("/expenses", payload);
        setMessage("Expense added successfully.");
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      await loadExpenses();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  function editExpense(expense) {
    setEditingId(expense._id);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      date: new Date(expense.date).toISOString().slice(0, 10),
      notes: expense.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id) {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      await API.delete(`/expenses/${id}`);
      setMessage("Expense deleted successfully.");
      await loadExpenses();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function loadAdmin() {
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        API.get("/admin/stats"),
        API.get("/admin/users"),
      ]);

      setAdmin(statsResponse.data);
      setAdminUsers(usersResponse.data);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-icon">₹</div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Expense Tracker</h1>
          <p className="muted">
            Understand your spending. Take control of your money.
          </p>

          <div className="tabs">
            <button
              type="button"
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === "register" ? "tab active" : "tab"}
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={submitAuth} className="form">
            {mode === "register" && (
              <label>
                Full name
                <input
                  required
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email address
              <input
                required
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    email: event.target.value,
                  })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                required
                type="password"
                minLength={mode === "register" ? 8 : undefined}
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    password: event.target.value,
                  })
                }
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Your password"
                }
              />
            </label>

            {message && <p className="notice">{message}</p>}

            <button
              type="submit"
              className="primary full"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login to your account"
                  : "Create account"}
            </button>
          </form>

          <p className="muted small">
            Create an account to start recording your expenses.
          </p>
        </section>
      </main>
    );
  }

  if (user.role === "admin") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span>₹</span> Expense Tracker
          </div>

          <div className="top-actions">
            <span className="role-pill">Administrator</span>
            <button className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard">
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Admin dashboard</h1>
          <p className="muted">
            Welcome, {user.name}. Here is the system overview.
          </p>

          {message && <p className="notice">{message}</p>}

          <section className="stats-grid">
            <Stat
              title="Registered users"
              value={admin?.totalUsers ?? "—"}
            />
            <Stat
              title="Expenses recorded"
              value={admin?.totalExpenses ?? "—"}
            />
            <Stat
              title="Total recorded spending"
              value={
                admin ? money(admin.totalSpending) : "—"
              }
            />
          </section>

          <section className="panel">
            <h2>Registered users</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {adminUsers.map((person) => (
                    <tr key={person._id}>
                      <td>{person.name}</td>
                      <td>{person.email}</td>
                      <td>
                        {new Date(person.createdAt).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>
                    </tr>
                  ))}

                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan="3">
                        No registered users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Recent expenses across the system</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>User</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {(admin?.recentExpenses || []).map((expense) => (
                    <tr key={expense._id}>
                      <td>{expense.title}</td>
                      <td>{expense.user?.name || "Unknown"}</td>
                      <td>{expense.category}</td>
                      <td>{money(expense.amount)}</td>
                    </tr>
                  ))}

                  {!admin?.recentExpenses?.length && (
                    <tr>
                      <td colSpan="4">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <button className="secondary" onClick={loadAdmin}>
            Refresh dashboard
          </button>
        </main>
      </div>
    );
  }

  const total = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const now = new Date();

  const thisMonth = expenses
    .filter((item) => {
      const date = new Date(item.date);

      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const filtered = expenses.filter((item) =>
    `${item.title} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>₹</span> Expense Tracker
        </div>

        <div className="top-actions">
          <span className="muted welcome">Hi, {user.name}</span>
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        <p className="eyebrow">YOUR FINANCES</p>
        <h1>Expense dashboard</h1>
        <p className="muted">
          Keep track of where your money goes.
        </p>

        {message && <p className="notice">{message}</p>}

        <section className="stats-grid">
          <Stat
            title="Total recorded spending"
            value={money(total)}
          />
          <Stat
            title="Spending this month"
            value={money(thisMonth)}
          />
          <Stat
            title="Number of expenses"
            value={expenses.length}
          />
        </section>

        <section className="panel">
          <h2>{editingId ? "Edit expense" : "Add a new expense"}</h2>

          <form onSubmit={saveExpense} className="expense-form">
            <label>
              Expense title
              <input
                required
                maxLength={100}
                placeholder="e.g. Lunch"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>

            <label>
              Amount (₹)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="250"
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
              />
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
              />
            </label>

            <label className="wide">
              Notes (optional)
              <input
                maxLength={500}
                placeholder="Add a short note"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </label>

            <div className="form-actions wide">
              <button type="submit" className="primary">
                {editingId ? "Save changes" : "Add expense"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...emptyForm });
                    setMessage("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Your expenses</h2>
              <p className="muted small">
                Your personal transaction history.
              </p>
            </div>

            <input
              className="search"
              placeholder="Search expenses..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <strong>{expense.title}</strong>
                      {expense.notes && (
                        <div className="muted small">
                          {expense.notes}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="category-pill">
                        {expense.category}
                      </span>
                    </td>

                    <td>
                      {new Date(expense.date).toLocaleDateString(
                        "en-IN"
                      )}
                    </td>

                    <td className="amount">
                      {money(expense.amount)}
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => editExpense(expense)}
                        >
                          Edit
                        </button>

                        <button
                          className="text-button danger"
                          onClick={() => deleteExpense(expense._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      No expenses found. Add your first expense above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <article className="stat-card">
      <p className="muted">{title}</p>
      <h2>{value}</h2>
    </article>
  );
}
