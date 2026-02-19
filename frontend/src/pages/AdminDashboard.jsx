import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

const STATUS_BADGE = {
    Open: "badge badge-open",
    "In Progress": "badge badge-progress",
    Solved: "badge badge-solved",
    Reviewed: "badge badge-reviewed",
    Closed: "badge badge-closed",
};
const STATUS_ICON = { Open: "🔵", "In Progress": "🟡", Solved: "🟢", Reviewed: "🟣", Closed: "⚫" };
const PRIORITY_BADGE = { Low: "badge badge-low", Medium: "badge badge-medium", High: "badge badge-high", hard: "badge badge-high" };

export default function AdminDashboard() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [acceptingId, setAcceptingId] = useState(null);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const [statsData, setStatsData] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();

    const handleLogout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/admin");
    }, [navigate]);

    const fetchProblems = useCallback(async () => {
        try {
            const { data } = await API.get("/problems");
            setProblems(data);
            setError("");
        } catch (err) {
            if (err.response?.status === 401) handleLogout();
            else setError("Failed to load problems.");
        } finally {
            setLoading(false);
        }
    }, [handleLogout]);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await API.get("/admin/stats");
            setStatsData(data);
        } catch (err) {
            console.error("Failed to load stats", err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!localStorage.getItem("token")) { navigate("/admin"); return; }
        fetchProblems();
        fetchStats();
    }, [fetchProblems, fetchStats, navigate]);

    const acceptProblem = async (id) => {
        setAcceptingId(id);
        try {
            await API.put(`/problems/${id}/accept`);
            fetchProblems();
        } catch (err) {
            alert(err.response?.data?.message || "Could not accept problem.");
        } finally {
            setAcceptingId(null);
        }
    };

    const getInitials = (name = "") => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

    const filteredProblems = (() => {
        if (activeTab === "open") return problems.filter((p) => p.status === "Open");
        if (activeTab === "inprogress") return problems.filter((p) => p.status === "In Progress");
        if (activeTab === "solved") return problems.filter((p) => p.status === "Solved" || p.status === "Reviewed" || p.status === "Closed");
        return problems;
    })();

    const stats = {
        total: problems.length,
        open: problems.filter((p) => p.status === "Open").length,
        inProgress: problems.filter((p) => p.status === "In Progress").length,
        solved: problems.filter((p) => ["Solved", "Reviewed", "Closed"].includes(p.status)).length,
    };

    return (
        <div className="dashboard-layout">
            {/* Navbar */}
            <nav className="navbar" style={{ borderBottom: "1px solid rgba(139,92,246,0.3)" }}>
                <div className="navbar-brand">
                    <div className="navbar-logo" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>🛡️</div>
                    <span className="navbar-title">ProblemTrack</span>
                    <span style={{
                        fontSize: 11, fontWeight: 600, background: "rgba(139,92,246,0.15)",
                        color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)",
                        borderRadius: 20, padding: "2px 10px", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.05em"
                    }}>Admin</span>
                </div>
                <div className="navbar-right">
                    <div className="navbar-user">
                        <div className="navbar-avatar" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                            {getInitials(user.name)}
                        </div>
                        <div className="navbar-user-info">
                            <div className="navbar-user-name">{user.name || "Admin"}</div>
                            <div className="navbar-user-role">🛡️ Administrator</div>
                        </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}>🚪 Logout</button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon purple">📋</div>
                        <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total Problems</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue">🔵</div>
                        <div><div className="stat-value">{stats.open}</div><div className="stat-label">Open</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow">⚡</div>
                        <div><div className="stat-value">{stats.inProgress}</div><div className="stat-label">In Progress</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">✅</div>
                        <div><div className="stat-value">{stats.solved}</div><div className="stat-label">Resolved</div></div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">
                            {activeTab === "leaderboard" ? "🏆 Employee Leaderboard" : "📋 All Problems"}
                        </h2>
                        <button className="btn btn-secondary btn-sm" onClick={() => { fetchProblems(); fetchStats(); }}>🔄 Refresh</button>
                    </div>
                    <div className="section-body">
                        <div className="tabs">
                            {[
                                { key: "all", label: "All" },
                                { key: "open", label: "Open" },
                                { key: "inprogress", label: "In Progress" },
                                { key: "solved", label: "Resolved" },
                                { key: "leaderboard", label: "Leaderboard 🏆" },
                            ].map((tab) => (
                                <button key={tab.key} className={`tab ${activeTab === tab.key ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
                            ))}
                        </div>

                        {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

                        {loading || (activeTab === "leaderboard" && statsLoading) ? (
                            <div className="empty-state">
                                <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                                <p className="empty-state-text" style={{ marginTop: 12 }}>Loading data...</p>
                            </div>
                        ) : activeTab === "leaderboard" ? (
                            <div className="leaderboard-view">
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                    {statsData?.topSolvers?.map((e, i) => (
                                        <div key={e._id} className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12, padding: 24 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                    <div className="navbar-avatar" style={{ margin: 0, width: 44, height: 44, fontSize: 16 }}>{getInitials(e.name)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>#{i + 1} Top Solver</div>
                                                            <div style={{
                                                                fontSize: 10,
                                                                background: e.role === "HR" ? "rgba(236,72,153,0.1)" : "rgba(59,130,246,0.1)",
                                                                color: e.role === "HR" ? "#ec4899" : "#3b82f6",
                                                                padding: "1px 6px",
                                                                borderRadius: "10px",
                                                                fontWeight: 600,
                                                                textTransform: "uppercase"
                                                            }}>{e.role || "Emp"}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 24 }}>{["🥇", "🥈", "🥉", "🏅", "🏅"][i] || "✨"}</div>
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%", marginTop: 8 }}>
                                                <div className="stat-item">
                                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Points</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: "#a78bfa" }}>{Math.round(e.totalPoints || 0)}</div>
                                                </div>
                                                <div className="stat-item">
                                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Avg Rating</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>⭐ {e.averageRating || 0}</div>
                                                </div>
                                                <div className="stat-item">
                                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Solved</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700 }}>{e.problemsSolved?.length || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : filteredProblems.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <p className="empty-state-text">No problems in this category.</p>
                            </div>
                        ) : (
                            <div className="problem-list">
                                {filteredProblems.map((p) => (
                                    <div className="problem-card" key={p._id}>
                                        <div className="problem-card-header">
                                            <h3 className="problem-title">{p.title}</h3>
                                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                                <span className={PRIORITY_BADGE[p.priority] || "badge badge-medium"}>{p.priority || "Medium"}</span>
                                                <span className={STATUS_BADGE[p.status] || "badge badge-open"}>{STATUS_ICON[p.status]} {p.status}</span>
                                            </div>
                                        </div>
                                        <p className="problem-desc">{p.description}</p>

                                        {/* Extra info row */}
                                        <div style={{
                                            background: "rgba(255,255,255,0.02)", borderRadius: 8,
                                            padding: "10px 14px", marginBottom: 14,
                                            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8
                                        }}>
                                            <div style={{ fontSize: 13 }}>
                                                <span style={{ color: "var(--text-muted)" }}>Raised by: </span>
                                                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.raisedBy?.name || "—"}</span>
                                            </div>
                                            <div style={{ fontSize: 13 }}>
                                                <span style={{ color: "var(--text-muted)" }}>Accepted/Solved by: </span>
                                                <span style={{
                                                    color: p.status === "Solved" ? "#10b981" : "var(--text-primary)",
                                                    fontWeight: 600
                                                }}>
                                                    {p.acceptedBy?.name || "—"}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 13 }}>
                                                <span style={{ color: "var(--text-muted)" }}>Category: </span>
                                                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.category || "Other"}</span>
                                            </div>
                                            <div style={{ fontSize: 13 }}>
                                                <span style={{ color: "var(--text-muted)" }}>Raised on: </span>
                                                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{formatDate(p.createdAt)}</span>
                                            </div>

                                            {/* Admin Solution View */}
                                            {(p.status === "Solved" || p.status === "Reviewed" || p.status === "Closed") && p.solution && (
                                                <div style={{
                                                    gridColumn: "1/-1",
                                                    marginTop: 8,
                                                    padding: "12px",
                                                    background: "rgba(99,102,241,0.05)",
                                                    borderRadius: 8,
                                                    border: "1px dashed rgba(99,102,241,0.2)"
                                                }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-color)", textTransform: "uppercase", marginBottom: 4 }}>
                                                        📝 Verified Solution
                                                    </div>
                                                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                                                        {p.solution.content || p.solution}
                                                    </p>
                                                </div>
                                            )}
                                            {p.rating && (
                                                <div style={{ fontSize: 13 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Rating: </span>
                                                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                                                        {"★".repeat(p.rating)}{"☆".repeat(5 - p.rating)} ({p.rating}/5)
                                                    </span>
                                                </div>
                                            )}
                                            {p.feedbackComment && (
                                                <div style={{ fontSize: 13, gridColumn: "1/-1" }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Feedback: </span>
                                                    <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>"{p.feedbackComment}"</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                            {p.status === "Open" && (
                                                <button className="btn btn-success" onClick={() => acceptProblem(p._id)}
                                                    disabled={acceptingId === p._id}>
                                                    {acceptingId === p._id ? <span className="spinner" /> : "✋"}&nbsp;
                                                    {acceptingId === p._id ? "Accepting..." : "Accept Problem"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
}
