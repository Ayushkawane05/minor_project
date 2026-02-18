import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";

export default function AdminLogin() {
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
            if (data.role !== "Admin") {
                setError("Access denied. This login is for Admins only.");
                setLoading(false);
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify({
                _id: data._id, name: data.name, email: data.email, role: data.role,
            }));
            navigate("/admin/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card" style={{ borderColor: "rgba(139,92,246,0.4)" }}>
                <div className="auth-logo">
                    <div className="auth-logo-icon">🛡️</div>
                    <span className="auth-logo-text">ProblemTrack</span>
                </div>

                <h1 className="auth-title">Admin Login</h1>
                <p className="auth-subtitle">Restricted access — Admins only</p>

                <div style={{
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#a78bfa",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                }}>
                    🔒 Only users with Admin role can access this portal.
                </div>

                {error && (
                    <div className="alert alert-error"><span>⚠️</span> {error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Admin Email</label>
                        <input className="form-input" type="email" name="email"
                            placeholder="admin@company.com" value={form.email}
                            onChange={handleChange} required autoComplete="email" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" name="password"
                            placeholder="Enter admin password" value={form.password}
                            onChange={handleChange} required autoComplete="current-password" />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading}
                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                        {loading ? <span className="spinner" /> : "🛡️"}&nbsp;
                        {loading ? "Verifying..." : "Sign In as Admin"}
                    </button>
                </form>

                <div className="auth-link" style={{ marginTop: 20 }}>
                    Not an admin? <Link to="/">Employee Login →</Link>
                </div>
            </div>
        </div>
    );
}
