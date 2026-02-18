import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/register", form);
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎯</div>
          <span className="auth-logo-text">ProblemTrack</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join your team's problem tracking system</p>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>✅</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              name="name"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="Employee">👤 Employee</option>
              <option value="HR">🧑‍💼 HR</option>
              <option value="Admin">🛡️ Admin</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "✨"}&nbsp;
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-link">
          Already have an account?{" "}
          <Link to="/">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
