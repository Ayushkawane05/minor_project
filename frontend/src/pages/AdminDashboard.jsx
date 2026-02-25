import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import socket from "../socket";
import {
    Shield, LogOut, FileText, CircleDot, Clock, CheckCircle, Lock,
    FileCheck, RotateCcw, Award, Trophy, Medal, Star, User, Search
} from "lucide-react";

// Status Icons Mapping
const StatusIcon = ({ status, size = 16 }) => {
    switch (status) {
        case "Open": return <CircleDot size={size} />;
        case "In Progress": return <Clock size={size} />;
        case "Solved": return <CheckCircle size={size} />;
        case "Reviewed": return <FileCheck size={size} />;
        case "Closed": return <Lock size={size} />;
        default: return <CircleDot size={size} />;
    }
};

const STATUS_BADGE = {
    Open: "badge badge-open",
    "In Progress": "badge badge-progress",
    Solved: "badge badge-solved",
    Reviewed: "badge badge-reviewed",
    Closed: "badge badge-closed",
};

const PRIORITY_BADGE = { Low: "badge badge-low", Medium: "badge badge-medium", High: "badge badge-high", hard: "badge badge-high" };

// Modal Component
function Modal({ title, onClose, children, maxWidth = 480 }) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16, backdropFilter: "blur(4px)"
        }}>
            <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)", padding: 32, width: "100%",
                maxWidth: maxWidth, boxShadow: "var(--shadow-lg)", animation: "slideUp 0.25s ease"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", color: "var(--text-muted)",
                        fontSize: 22, cursor: "pointer", lineHeight: 1
                    }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [acceptingId, setAcceptingId] = useState(null);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const [statsData, setStatsData] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // User History state
    const [selectedUserHistory, setSelectedUserHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Solution modal state
    const [solutionModal, setSolutionModal] = useState(null);
    const [solutionText, setSolutionText] = useState("");
    const [solutionError, setSolutionError] = useState("");
    const [solutionLoading, setSolutionLoading] = useState(false);

    // Leaderboard view/sort state
    const [leaderboardView, setLeaderboardView] = useState("grid");
    const [leaderboardSort, setLeaderboardSort] = useState("points");

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

    const fetchUserHistory = async (userId) => {
        setHistoryLoading(true);
        try {
            const { data } = await API.get(`/admin/leaderboard/${userId}/history`);
            setSelectedUserHistory(data);
        } catch (err) {
            alert("Failed to load user history");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (!localStorage.getItem("token")) { navigate("/admin"); return; }
        fetchProblems();
        fetchStats();

        socket.on("newProblem", (problem) => {
            setProblems((prev) => {
                if (prev.find((p) => p.problemId === problem.problemId)) return prev;
                return [problem, ...prev];
            });
            fetchStats();
        });

        socket.on("problemUpdated", (updatedProblem) => {
            setProblems((prev) =>
                prev.map((p) => (p.problemId === updatedProblem.problemId ? updatedProblem : p))
            );
            fetchStats();
        });

        socket.on("solutionSubmitted", (solution) => {
            setProblems((prev) =>
                prev.map((p) => {
                    if (p.problemId === (solution.problemDetails?.problemId || solution.problem)) {
                        return { ...p, status: "Solved", solution };
                    }
                    return p;
                })
            );
            fetchStats();
        });

        return () => {
            socket.off("newProblem");
            socket.off("problemUpdated");
            socket.off("solutionSubmitted");
        };
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

    const submitSolution = async () => {
        setSolutionError("");
        if (!solutionText.trim()) { setSolutionError("Please write your solution."); return; }
        setSolutionLoading(true);
        try {
            await API.post(`/solutions/${solutionModal._id}`, { solutionText });
            setSolutionModal(null);
            setSolutionText("");
            fetchProblems();
        } catch (err) {
            setSolutionError(err.response?.data?.message || "Failed to submit solution.");
        } finally {
            setSolutionLoading(false);
        }
    };

    const sortedUsers = (() => {
        if (!statsData?.topSolvers) return [];
        return [...statsData.topSolvers].sort((a, b) => {
            if (leaderboardSort === "points") return (b.totalPoints || 0) - (a.totalPoints || 0);
            if (leaderboardSort === "rating") return (b.averageRating || 0) - (a.averageRating || 0);
            if (leaderboardSort === "solved") return (b.problemsSolved?.length || 0) - (a.problemsSolved?.length || 0);
            return 0;
        });
    })();

    const getInitials = (name = "") => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

    const filteredProblems = (() => {
        if (activeTab === "open") return problems.filter((p) => p.status === "Open");
        if (activeTab === "inprogress") return problems.filter((p) => p.status === "In Progress");
        if (activeTab === "solved") return problems.filter((p) => ["Solved", "Reviewed", "Closed"].includes(p.status));
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
            <nav className="navbar" style={{ borderBottom: "1px solid rgba(139,92,246,0.3)" }}>
                <div className="navbar-brand">
                    <div className="navbar-logo" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                        <Shield size={20} color="white" />
                    </div>
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
                            <div className="navbar-user-role">Administrator</div>
                        </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon purple"><FileText size={24} color="#6366f1" /></div>
                        <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total Problems</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue"><CircleDot size={24} color="#3b82f6" /></div>
                        <div><div className="stat-value">{stats.open}</div><div className="stat-label">Open</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow"><Clock size={24} color="#f59e0b" /></div>
                        <div><div className="stat-value">{stats.inProgress}</div><div className="stat-label">In Progress</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"><CheckCircle size={24} color="#10b981" /></div>
                        <div><div className="stat-value">{stats.solved}</div><div className="stat-label">Resolved</div></div>
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">
                            {activeTab === "leaderboard" ? <><Trophy size={20} /> Employee Leaderboard</> : <><FileText size={20} /> All Problems</>}
                        </h2>
                        <button className="btn btn-secondary btn-sm" onClick={() => { fetchProblems(); fetchStats(); }}>
                            <RotateCcw size={16} /> Refresh
                        </button>
                    </div>
                    <div className="section-body">
                        <div className="tabs">
                            {[
                                { key: "all", label: "All" },
                                { key: "open", label: "Open" },
                                { key: "inprogress", label: "In Progress" },
                                { key: "solved", label: "Resolved" },
                                { key: "leaderboard", label: "Leaderboard" },
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
                                <div className="leaderboard-controls" style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    marginBottom: 20, padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: 12
                                }}>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button className={`btn btn-${leaderboardView === "grid" ? "primary" : "secondary"} btn-sm`}
                                            onClick={() => setLeaderboardView("grid")}>Grid View</button>
                                        <button className={`btn btn-${leaderboardView === "table" ? "primary" : "secondary"} btn-sm`}
                                            onClick={() => setLeaderboardView("table")}>Table View</button>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Sort By:</span>
                                        <select className="form-select" style={{ padding: "4px 12px", fontSize: 13, width: "auto" }}
                                            value={leaderboardSort} onChange={(e) => setLeaderboardSort(e.target.value)}>
                                            <option value="points">Total Points</option>
                                            <option value="rating">Avg Rating</option>
                                            <option value="solved">Problems Solved</option>
                                        </select>
                                    </div>
                                </div>

                                {leaderboardView === "grid" ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                        {sortedUsers.map((e, i) => (
                                            <div key={e._id} className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12, padding: 24, position: "relative" }}>
                                                {i < 3 && <div style={{
                                                    position: "absolute", top: -10, right: -10, background: "var(--bg-card)",
                                                    fontSize: 24, padding: 4, borderRadius: "50%", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)"
                                                }}>
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                                </div>}
                                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                                    <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => fetchUserHistory(e._id)}>
                                                        <div className="navbar-avatar" style={{ margin: 0, width: 44, height: 44, fontSize: 16 }}>{getInitials(e.name)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
                                                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>#{i + 1} Position</div>
                                                                <div style={{
                                                                    fontSize: 10,
                                                                    background: e.role === "HR" ? "rgba(236,72,153,0.1)" : e.role === "Admin" ? "rgba(139,92,246,0.1)" : "rgba(59,130,246,0.1)",
                                                                    color: e.role === "HR" ? "#ec4899" : e.role === "Admin" ? "#8b5cf6" : "#3b82f6",
                                                                    padding: "1px 6px",
                                                                    borderRadius: "10px",
                                                                    fontWeight: 600,
                                                                    textTransform: "uppercase"
                                                                }}>{e.role || "Emp"}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%", marginTop: 8 }}>
                                                    <div className="stat-item">
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Points</div>
                                                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{Math.round(e.totalPoints || 0)}</div>
                                                    </div>
                                                    <div className="stat-item">
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rating</div>
                                                        <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                                                            {e.averageRating ? <><Star size={16} fill="#f59e0b" color="#f59e0b" /> {e.averageRating.toFixed(1)}</> : "—"}
                                                        </div>
                                                    </div>
                                                    <div className="stat-item">
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Solved</div>
                                                        <div style={{ fontSize: 18, fontWeight: 800 }}>{e.problemsSolved?.length || 0}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ overflowX: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ textAlign: "left", fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                                                    <th style={{ padding: "16px 12px" }}>Rank</th>
                                                    <th style={{ padding: "16px 12px" }}>User</th>
                                                    <th style={{ padding: "16px 12px" }}>ID</th>
                                                    <th style={{ padding: "16px 12px" }}>Points</th>
                                                    <th style={{ padding: "16px 12px" }}>Rating</th>
                                                    <th style={{ padding: "16px 12px" }}>Solved</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedUsers.map((e, i) => (
                                                    <tr key={e.userId} className="table-row-hover" style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }} onClick={() => fetchUserHistory(e.userId)}>
                                                        <td style={{ padding: 12 }}>{i + 1}</td>
                                                        <td style={{ padding: 12, fontWeight: 600 }}>{e.name}</td>
                                                        <td style={{ padding: 12, fontSize: 11, color: "var(--text-muted)" }}>{e.userId}</td>
                                                        <td style={{ padding: 12, color: "var(--accent)", fontWeight: 700 }}>{Math.round(e.totalPoints)}</td>
                                                        <td style={{ padding: 12 }}>{e.averageRating?.toFixed(1) || "—"}</td>
                                                        <td style={{ padding: 12 }}>{e.problemsSolved?.length || 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        ) : filteredProblems.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><Search size={48} /></div>
                                <p className="empty-state-text">No problems here.</p>
                            </div>
                        ) : (
                            <div className="problem-list">
                                {filteredProblems.map((p) => {
                                    const isSolver = p.acceptedBy?._id === user._id;
                                    return (
                                        <div className="problem-card" key={p.problemId} style={{ animation: "fadeIn 0.3s ease" }}>
                                            <div className="problem-card-header">
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "rgba(139,92,246,0.1)", padding: "2px 6px", borderRadius: 4 }}>{p.problemId}</span>
                                                        <h3 className="problem-title">{p.title}</h3>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                                                        <span>{p.category}</span>
                                                        <span>•</span>
                                                        <span className={PRIORITY_BADGE[p.priority]}>{p.priority}</span>
                                                    </div>
                                                </div>
                                                <span className={STATUS_BADGE[p.status]}>
                                                    <StatusIcon status={p.status} />
                                                    {p.status}
                                                </span>
                                            </div>
                                            <p className="problem-desc">{p.description}</p>
                                            <div className="problem-card-footer">
                                                <div className="problem-meta">
                                                    <div className="meta-item">
                                                        <User size={14} />
                                                        <span>Raised by: <strong>{p.raisedBy?.name || "—"}</strong></span>
                                                    </div>
                                                    {p.acceptedBy && (
                                                        <div className="meta-item">
                                                            <CheckCircle size={14} />
                                                            {/* <span>Solved by: <strong>{p.acceptedBy.name}</strong></span> */}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="problem-actions">
                                                    {p.status === "Open" && (
                                                        <button className="btn btn-primary btn-sm" onClick={() => acceptProblem(p._id)} disabled={acceptingId === p._id}>
                                                            {acceptingId === p._id ? <span className="spinner" /> : <Clock size={14} />}
                                                            Accept
                                                        </button>
                                                    )}
                                                    {isSolver && p.status === "In Progress" && (
                                                        <button className="btn btn-success btn-sm" onClick={() => { setSolutionModal(p); setSolutionText(""); setSolutionError(""); }}>
                                                            <FileText size={14} />
                                                            Submit Solution
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {solutionModal && (
                <Modal title={`Submit Solution for ${solutionModal.problemId}`} onClose={() => setSolutionModal(null)} maxWidth={500}>
                    <div className="form-group">
                        <label className="form-label">Solution Details</label>
                        <textarea className="form-textarea" placeholder="Describe how you solved this problem..." value={solutionText} onChange={(e) => setSolutionText(e.target.value)} style={{ minHeight: 150 }} />
                        {solutionError && <div className="alert alert-error" style={{ marginTop: 12 }}>{solutionError}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                        <button className="btn btn-secondary" onClick={() => setSolutionModal(null)} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn btn-primary" onClick={submitSolution} disabled={solutionLoading} style={{ flex: 2 }}>
                            {solutionLoading ? <span className="spinner" /> : "Submit Solution"}
                        </button>
                    </div>
                </Modal>
            )}

            {selectedUserHistory && (
                <Modal title={`${selectedUserHistory.name}'s History`} onClose={() => setSelectedUserHistory(null)} maxWidth={600}>
                    <div className="history-container" style={{ maxHeight: 450, overflowY: "auto", paddingRight: 8 }}>
                        <div style={{ marginBottom: 20, padding: 16, background: "rgba(139,92,246,0.05)", borderRadius: 12, border: "1px solid rgba(139,92,246,0.1)", display: "flex", justifyContent: "space-between" }}>
                            <div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>User ID</div>
                                <div style={{ fontWeight: 700, color: "var(--accent)" }}>{selectedUserHistory.userId}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Points</div>
                                <div style={{ fontWeight: 700, fontSize: 18 }}>{Math.round(selectedUserHistory.totalPoints)}</div>
                            </div>
                        </div>

                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>Solved Problems</h4>

                        {selectedUserHistory.problemsSolved?.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 32, background: "var(--bg-body)", borderRadius: 12, color: "var(--text-muted)" }}>
                                No problems solved yet.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {selectedUserHistory.problemsSolved.map((p) => (
                                    <div key={p.problemId} style={{ padding: 16, background: "var(--bg-body)", borderRadius: 12, border: "1px solid var(--border)", position: "relative" }}>
                                        <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>{p.problemId}</div>
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                                {formatDate(p.solvedAt)} • <span className={STATUS_BADGE[p.status]}>{p.status}</span>
                                            </div>
                                            {p.rating && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b", fontWeight: 700 }}>
                                                    <Star size={14} fill="#f59e0b" /> {p.rating}
                                                </div>
                                            )}
                                        </div>
                                        {p.solution?.sentimentScore && (
                                            <div style={{ marginTop: 8, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${p.solution.sentimentScore * 100}%`, background: p.solution.sentimentScore > 0.6 ? "#10b981" : p.solution.sentimentScore > 0.4 ? "#f59e0b" : "#ef4444" }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="btn btn-secondary" style={{ width: "100%", marginTop: 24 }} onClick={() => setSelectedUserHistory(null)}>Close</button>
                </Modal>
            )}

            {historyLoading && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
                    <span className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
                </div>
            )}
        </div>
    );
}
