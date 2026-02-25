import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";
import { LogIn, AlertCircle, Lock, Target, Mail } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await API.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
      }));
      if (data.role === "Admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Target size={32} color="white" />
          </div>
          <span className="auth-logo-text">ProblemTrack</span>
        </div>

        <h1 className="auth-title">Employee Login</h1>
        <p className="auth-subtitle">Sign in to raise and track problems</p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} style={{ marginRight: 8, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <Mail size={18} />
              </span>
              <input
                className="form-input with-icon"
                type="email"
                name="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                className="form-input with-icon"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <LogIn size={18} />}
            <span style={{ marginLeft: 8 }}>{loading ? "Signing in..." : "Sign In as Employee"}</span>
          </button>
        </form>

        <div className="auth-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
        <div className="auth-link" style={{ marginTop: 8 }}>
          Are you an Admin? <Link to="/admin">Admin Login →</Link>
        </div>
      </div>
    </div>
  );
}
